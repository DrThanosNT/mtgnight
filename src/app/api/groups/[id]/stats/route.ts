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
  const playerIds = searchParams.getAll("playerId");

  const gameFilterConditions: Prisma.Sql[] = [Prisma.sql`g."groupId" = ${groupId}`];

  if (playerIds.length > 0) {
    // Exact set match: the game's total player count must equal the
    // selection size, AND every one of the game's players must be in the
    // selection - together these two conditions mean "this game's
    // participants are exactly this set, no more, no fewer."
    gameFilterConditions.push(Prisma.sql`
      g.id IN (
        SELECT gp2."gameId"
        FROM "GamePlayer" gp2
        GROUP BY gp2."gameId"
        HAVING COUNT(*) = ${playerIds.length}
           AND COUNT(*) FILTER (WHERE gp2."userId" IN (${Prisma.join(playerIds)})) = ${playerIds.length}
      )
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
