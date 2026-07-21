import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getActiveMembership } from "@/lib/groups";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const { id: groupId, userId: targetUserId } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const membership = await getActiveMembership(groupId, user.id);
  if (!membership) return NextResponse.json({ error: "Not a member of this group" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const deckId = searchParams.get("deckId");
  const playedFirst = searchParams.get("playedFirst"); // "true" | "false" | null

  const conditions: Prisma.Sql[] = [
    Prisma.sql`g."groupId" = ${groupId}`,
    Prisma.sql`gp."userId" = ${targetUserId}`,
  ];
  if (deckId) conditions.push(Prisma.sql`gp."deckId" = ${deckId}`);
  if (playedFirst === "true") conditions.push(Prisma.sql`gp."seatOrder" = 0`);
  if (playedFirst === "false") conditions.push(Prisma.sql`gp."seatOrder" != 0`);

  const whereClause = Prisma.join(conditions, " AND ");

  const rows = await prisma.$queryRaw<{ gamesPlayed: bigint; wins: bigint }[]>`
    SELECT COUNT(*)::bigint AS "gamesPlayed",
           SUM(CASE WHEN gp."isWinner" THEN 1 ELSE 0 END)::bigint AS wins
    FROM "GamePlayer" gp
    JOIN "Game" g ON g.id = gp."gameId"
    WHERE ${whereClause}
  `;

  const decksUsed = await prisma.$queryRaw<{ id: string; name: string }[]>`
    SELECT DISTINCT d.id, d.name
    FROM "GamePlayer" gp
    JOIN "Game" g ON g.id = gp."gameId"
    JOIN "Deck" d ON d.id = gp."deckId"
    WHERE g."groupId" = ${groupId} AND gp."userId" = ${targetUserId}
    ORDER BY d.name ASC
  `;

  const gamesPlayed = Number(rows[0]?.gamesPlayed ?? 0);
  const wins = Number(rows[0]?.wins ?? 0);

  return NextResponse.json({
    gamesPlayed,
    wins,
    winRate: gamesPlayed > 0 ? wins / gamesPlayed : 0,
    decksUsed,
  });
}
