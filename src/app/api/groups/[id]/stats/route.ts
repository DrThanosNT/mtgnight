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

  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const playerIds = searchParams.getAll("playerId"); // exact-set: games with exactly these players, no more, no fewer
  const deckUserId = searchParams.get("deckUserId");
  const deckId = searchParams.get("deckId");
  const seatParams = searchParams.getAll("seat"); // "userId:seatNumber", 1-indexed

  const conditions: Prisma.Sql[] = [Prisma.sql`g."groupId" = ${groupId}`];

  if (playerIds.length > 0) {
    conditions.push(Prisma.sql`
      g.id IN (
        SELECT gp2."gameId" FROM "GamePlayer" gp2
        GROUP BY gp2."gameId"
        HAVING COUNT(*) = ${playerIds.length}
           AND COUNT(*) FILTER (WHERE gp2."userId" IN (${Prisma.join(playerIds)})) = ${playerIds.length}
      )
    `);
  }

  if (deckUserId && deckId) {
    conditions.push(Prisma.sql`
      g.id IN (SELECT gp3."gameId" FROM "GamePlayer" gp3 WHERE gp3."userId" = ${deckUserId} AND gp3."deckId" = ${deckId})
    `);
  }

  for (const raw of seatParams) {
    const [uid, seatStr] = raw.split(":");
    const seatNum = parseInt(seatStr, 10);
    if (!uid || Number.isNaN(seatNum) || seatNum < 1) continue;
    conditions.push(Prisma.sql`
      g.id IN (SELECT gp4."gameId" FROM "GamePlayer" gp4 WHERE gp4."userId" = ${uid} AND gp4."seatOrder" = ${seatNum - 1})
    `);
  }

  const whereClause = Prisma.join(conditions, " AND ");

  const perPlayerRows = await prisma.$queryRaw<{ userId: string; displayName: string; gamesPlayed: bigint; wins: bigint }[]>`
    SELECT gp."userId", u."displayName", COUNT(*)::bigint AS "gamesPlayed",
           SUM(CASE WHEN gp."isWinner" THEN 1 ELSE 0 END)::bigint AS wins
    FROM "GamePlayer" gp
    JOIN "Game" g ON g.id = gp."gameId"
    JOIN "User" u ON u.id = gp."userId"
    WHERE ${whereClause}
    GROUP BY gp."userId", u."displayName"
    ORDER BY wins DESC
  `;

  const seatRows = await prisma.$queryRaw<{ seatOrder: number; gamesPlayed: bigint; wins: bigint }[]>`
    SELECT gp."seatOrder", COUNT(*)::bigint AS "gamesPlayed",
           SUM(CASE WHEN gp."isWinner" THEN 1 ELSE 0 END)::bigint AS wins
    FROM "GamePlayer" gp
    JOIN "Game" g ON g.id = gp."gameId"
    WHERE ${whereClause}
    GROUP BY gp."seatOrder"
  `;

  const turnRows = await prisma.$queryRaw<{ turnCount: number; count: bigint }[]>`
    SELECT g."turnCount", COUNT(*)::bigint AS count
    FROM "Game" g
    WHERE ${whereClause} AND g."turnCount" IS NOT NULL
    GROUP BY g."turnCount"
  `;

  const players = perPlayerRows.map((r) => ({
    userId: r.userId,
    displayName: r.displayName,
    gamesPlayed: Number(r.gamesPlayed),
    wins: Number(r.wins),
    winRate: Number(r.gamesPlayed) > 0 ? Number(r.wins) / Number(r.gamesPlayed) : 0,
  }));

  // If a specific set of players was selected, that count IS the number of
  // seats that could possibly exist in a matching game (exact-set filter
  // guarantees every matching game had exactly that many players) - show
  // only that many seats rather than always the group's full player count.
  const seatCount = playerIds.length > 0 ? playerIds.length : group.playerCount;

  const totalSeatGames = seatRows.reduce((sum, r) => sum + Number(r.gamesPlayed), 0);
  const seatByOrder = new Map(seatRows.map((r) => [r.seatOrder, r]));

  // No games at all match the current filter combination - show nothing
  // rather than a full column of 0%/0-games rows.
  const seatWins =
    totalSeatGames === 0
      ? []
      : Array.from({ length: seatCount }, (_, i) => {
          const row = seatByOrder.get(i);
          const gamesPlayed = row ? Number(row.gamesPlayed) : 0;
          const wins = row ? Number(row.wins) : 0;
          return { seat: i + 1, gamesPlayed, wins, winRate: gamesPlayed > 0 ? wins / gamesPlayed : 0 };
        });

  const totalTurnGames = turnRows.reduce((sum, r) => sum + Number(r.count), 0);
  const maxTurn = turnRows.length > 0 ? Math.max(...turnRows.map((r) => r.turnCount)) : 0;
  const turnByCount = new Map(turnRows.map((r) => [r.turnCount, Number(r.count)]));
  const turns = Array.from({ length: maxTurn }, (_, i) => {
    const turn = i + 1;
    const count = turnByCount.get(turn) ?? 0;
    return { turn, count, percent: totalTurnGames > 0 ? (count / totalTurnGames) * 100 : 0 };
  });

  return NextResponse.json({ players, seatWins, turns });
}
