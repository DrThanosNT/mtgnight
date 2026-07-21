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
  const winnerId = searchParams.get("winnerId");
  const deckIds = searchParams.getAll("deckId");
  const playedFirst = searchParams.get("playedFirst");

  if (winnerId) {
    // Scoped to one player's wins - deck/played-first filters make sense
    // here since they're tied to that specific player's own game rows.
    const conditions: Prisma.Sql[] = [
      Prisma.sql`g."groupId" = ${groupId}`,
      Prisma.sql`gp."userId" = ${winnerId}`,
      Prisma.sql`gp."isWinner" = true`,
      Prisma.sql`g."turnCount" IS NOT NULL`,
    ];
    if (deckIds.length > 0) conditions.push(Prisma.sql`gp."deckId" IN (${Prisma.join(deckIds)})`);
    if (playedFirst === "true") conditions.push(Prisma.sql`gp."seatOrder" = 0`);
    if (playedFirst === "false") conditions.push(Prisma.sql`gp."seatOrder" != 0`);
    const whereClause = Prisma.join(conditions, " AND ");

    const rows = await prisma.$queryRaw<{ turnCount: number; count: bigint }[]>`
      SELECT g."turnCount", COUNT(*)::bigint AS count
      FROM "GamePlayer" gp
      JOIN "Game" g ON g.id = gp."gameId"
      WHERE ${whereClause}
      GROUP BY g."turnCount"
    `;

    const total = rows.reduce((sum, r) => sum + Number(r.count), 0);
    const maxTurn = rows.length > 0 ? Math.max(...rows.map((r) => r.turnCount)) : 0;
    const byTurn = new Map(rows.map((r) => [r.turnCount, Number(r.count)]));
    const turns = Array.from({ length: maxTurn }, (_, i) => {
      const turn = i + 1;
      const count = byTurn.get(turn) ?? 0;
      return { turn, count, percent: total > 0 ? (count / total) * 100 : 0 };
    });

    return NextResponse.json({ mode: "wins", total, turns });
  }

  // No specific player - distribution of ending turn across every game in
  // the group. A game has exactly one turnCount regardless of player count,
  // so dedupe on game id.
  const rows = await prisma.$queryRaw<{ turnCount: number; count: bigint }[]>`
    SELECT g."turnCount", COUNT(*)::bigint AS count
    FROM "Game" g
    WHERE g."groupId" = ${groupId} AND g."turnCount" IS NOT NULL
    GROUP BY g."turnCount"
  `;

  const totalRow = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count FROM "Game" g
    WHERE g."groupId" = ${groupId} AND g."turnCount" IS NOT NULL
  `;
  const totalGames = Number(totalRow[0]?.count ?? 0);

  const maxTurn = rows.length > 0 ? Math.max(...rows.map((r) => r.turnCount)) : 0;
  const byTurn = new Map(rows.map((r) => [r.turnCount, Number(r.count)]));
  const turns = Array.from({ length: maxTurn }, (_, i) => {
    const turn = i + 1;
    const count = byTurn.get(turn) ?? 0;
    return { turn, count, percent: totalGames > 0 ? (count / totalGames) * 100 : 0 };
  });

  return NextResponse.json({ mode: "all", total: totalGames, turns });
}
