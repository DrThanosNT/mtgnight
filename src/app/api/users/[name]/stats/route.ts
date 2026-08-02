import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const viewer = await getCurrentUser();
  if (!viewer) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const target = await prisma.user.findUnique({ where: { displayName: name } });
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const groupId = searchParams.get("groupId");
  const deckId = searchParams.get("deckId");
  const seat = searchParams.get("seat");

  const conditions: Prisma.Sql[] = [Prisma.sql`gp."userId" = ${target.id}`];
  if (groupId) conditions.push(Prisma.sql`g."groupId" = ${groupId}`);
  if (deckId) conditions.push(Prisma.sql`gp."deckId" = ${deckId}`);
  if (seat) {
    const seatNum = parseInt(seat, 10);
    if (!Number.isNaN(seatNum) && seatNum >= 1) conditions.push(Prisma.sql`gp."seatOrder" = ${seatNum - 1}`);
  }
  const whereClause = Prisma.join(conditions, " AND ");

  const overallRows = await prisma.$queryRaw<{ gamesPlayed: bigint; wins: bigint }[]>`
    SELECT COUNT(*)::bigint AS "gamesPlayed", SUM(CASE WHEN gp."isWinner" THEN 1 ELSE 0 END)::bigint AS wins
    FROM "GamePlayer" gp JOIN "Game" g ON g.id = gp."gameId"
    WHERE ${whereClause}
  `;
  const gamesPlayed = Number(overallRows[0]?.gamesPlayed ?? 0);
  const wins = Number(overallRows[0]?.wins ?? 0);

  const groupsPlayed = await prisma.$queryRaw<{ id: string; name: string }[]>`
    SELECT DISTINCT gr.id, gr.name
    FROM "GamePlayer" gp JOIN "Game" g ON g.id = gp."gameId" JOIN "Group" gr ON gr.id = g."groupId"
    WHERE gp."userId" = ${target.id}
    ORDER BY gr.name ASC
  `;

  const decksUsed = await prisma.$queryRaw<{ id: string; name: string }[]>`
    SELECT DISTINCT d.id, d.name FROM "GamePlayer" gp JOIN "Deck" d ON d.id = gp."deckId"
    WHERE gp."userId" = ${target.id}
    ORDER BY d.name ASC
  `;

  const seatWhereClause = Prisma.join(
    [
      Prisma.sql`gp."userId" = ${target.id}`,
      ...(groupId ? [Prisma.sql`g."groupId" = ${groupId}`] : []),
      ...(deckId ? [Prisma.sql`gp."deckId" = ${deckId}`] : []),
    ],
    " AND "
  );
  const seatRows = await prisma.$queryRaw<{ seatOrder: number; gamesPlayed: bigint; wins: bigint }[]>`
    SELECT gp."seatOrder", COUNT(*)::bigint AS "gamesPlayed", SUM(CASE WHEN gp."isWinner" THEN 1 ELSE 0 END)::bigint AS wins
    FROM "GamePlayer" gp JOIN "Game" g ON g.id = gp."gameId"
    WHERE ${seatWhereClause}
    GROUP BY gp."seatOrder" ORDER BY gp."seatOrder" ASC
  `;
  const seatWins = seatRows.map((r) => ({
    seat: r.seatOrder + 1, gamesPlayed: Number(r.gamesPlayed), wins: Number(r.wins),
    winRate: Number(r.gamesPlayed) > 0 ? Number(r.wins) / Number(r.gamesPlayed) : 0,
  }));

  const turnRows = await prisma.$queryRaw<{ turnCount: number; count: bigint }[]>`
    SELECT g."turnCount", COUNT(*)::bigint AS count
    FROM "GamePlayer" gp JOIN "Game" g ON g.id = gp."gameId"
    WHERE ${whereClause} AND g."turnCount" IS NOT NULL
    GROUP BY g."turnCount"
  `;
  const totalTurnGames = turnRows.reduce((s, r) => s + Number(r.count), 0);
  const maxTurn = turnRows.length > 0 ? Math.max(...turnRows.map((r) => r.turnCount)) : 0;
  const turnByCount = new Map(turnRows.map((r) => [r.turnCount, Number(r.count)]));
  const turns = Array.from({ length: maxTurn }, (_, i) => {
    const turn = i + 1;
    const count = turnByCount.get(turn) ?? 0;
    return { turn, count, percent: totalTurnGames > 0 ? (count / totalTurnGames) * 100 : 0 };
  });

  return NextResponse.json({
    displayName: target.displayName,
    gamesPlayed, wins, winRate: gamesPlayed > 0 ? wins / gamesPlayed : 0,
    groupsPlayed, decksUsed, seatWins, turns,
  });
}
