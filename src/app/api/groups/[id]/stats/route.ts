import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getActiveMembership } from "@/lib/groups";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: groupId } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const membership = await getActiveMembership(groupId, user.id);
  if (!membership) return NextResponse.json({ error: "Not a member of this group" }, { status: 403 });

  const perPlayer = await prisma.$queryRaw<{ userId: string; displayName: string; gamesPlayed: bigint; wins: bigint }[]>`
    SELECT gp."userId", u."displayName", COUNT(*)::bigint AS "gamesPlayed",
           SUM(CASE WHEN gp."isWinner" THEN 1 ELSE 0 END)::bigint AS wins
    FROM "GamePlayer" gp
    JOIN "Game" g ON g.id = gp."gameId"
    JOIN "User" u ON u.id = gp."userId"
    WHERE g."groupId" = ${groupId}
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
