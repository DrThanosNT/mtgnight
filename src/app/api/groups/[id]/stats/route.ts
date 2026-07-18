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

  const bySeat = await prisma.$queryRaw<{ seatOrder: number; gamesPlayed: bigint; wins: bigint }[]>`
    SELECT gp."seatOrder", COUNT(*)::bigint AS "gamesPlayed",
           SUM(CASE WHEN gp."isWinner" THEN 1 ELSE 0 END)::bigint AS wins
    FROM "GamePlayer" gp
    JOIN "Game" g ON g.id = gp."gameId"
    WHERE g."groupId" = ${groupId}
    GROUP BY gp."seatOrder"
    ORDER BY gp."seatOrder" ASC
  `;

  const byDeck = await prisma.$queryRaw<{ deckId: string; deckName: string; ownerId: string; gamesPlayed: bigint; wins: bigint }[]>`
    SELECT gp."deckId", d.name AS "deckName", d."ownerId", COUNT(*)::bigint AS "gamesPlayed",
           SUM(CASE WHEN gp."isWinner" THEN 1 ELSE 0 END)::bigint AS wins
    FROM "GamePlayer" gp
    JOIN "Game" g ON g.id = gp."gameId"
    JOIN "Deck" d ON d.id = gp."deckId"
    WHERE g."groupId" = ${groupId} AND gp."deckId" IS NOT NULL
    GROUP BY gp."deckId", d.name, d."ownerId"
    ORDER BY wins DESC
  `;

  const toRate = (rows: { wins: bigint; gamesPlayed: bigint }[]) =>
    rows.map((r) => ({
      ...r,
      wins: Number(r.wins),
      gamesPlayed: Number(r.gamesPlayed),
      winRate: Number(r.gamesPlayed) > 0 ? Number(r.wins) / Number(r.gamesPlayed) : 0,
    }));

  return NextResponse.json({ perPlayer: toRate(perPlayer), bySeat: toRate(bySeat), byDeck: toRate(byDeck) });
}