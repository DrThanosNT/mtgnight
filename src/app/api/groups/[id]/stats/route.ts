import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getActiveMembership } from "@/lib/groups";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: groupId } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const membership = await getActiveMembership(groupId, user.id);
  if (!membership) return NextResponse.json({ error: "Not a member of this group" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const playerIds = searchParams.getAll("playerId"); // must ALL have played in the game (subset match, other players may also be present)
  const fullAttendanceOnly = searchParams.get("fullAttendance") === "true";

  const gameFilterConditions: Prisma.Sql[] = [Prisma.sql`g."groupId" = ${groupId}`];

  if (playerIds.length > 0) {
    gameFilterConditions.push(Prisma.sql`
      g.id IN (
        SELECT gp2."gameId"
        FROM "GamePlayer" gp2
        WHERE gp2."userId" IN (${Prisma.join(playerIds)})
        GROUP BY gp2."gameId"
        HAVING COUNT(DISTINCT gp2."userId") = ${playerIds.length}
      )
    `);
  }

  if (fullAttendanceOnly) {
    gameFilterConditions.push(Prisma.sql`
      (SELECT COUNT(*) FROM "GamePlayer" gpAll WHERE gpAll."gameId" = g.id)
      = (SELECT COUNT(*) FROM "GroupMember" gm WHERE gm."groupId" = ${groupId} AND gm."leftAt" IS NULL)
    `);
  }

  const gameWhereClause = Prisma.join(gameFilterConditions, " AND ");

  const perPlayer = await prisma.$queryRaw<{ userId: string; displayName: string; gamesPlayed: bigint; wins: bigint }[]>`
    SELECT gp."userId", u."displayName", COUNT(*)::bigint AS "gamesPlayed",
           SUM(CASE WHEN gp."isWinner" THEN 1 ELSE 0 END)::bigint AS wins
    FROM "GamePlayer" gp
    JOIN "Game" g ON g.id = gp."gameId"
    JOIN "User" u ON u.id = gp."userId"
    WHERE ${gameWhereClause}
    GROUP BY gp."userId", u."displayName"
    ORDER BY wins DESC
  `;

  const players = perPlayer.map((r) => ({
    userId: r.userId,
    displayName: r.displayName,
    gamesPlayed: Number(r.gamesPlayed),
    wins: Number(r.wins),
    winRate: Number(r.gamesPlayed) > 0 ? Number(r.wins) / Number(r.gamesPlayed) : 0,
  }));

  return NextResponse.json({ players });
}
