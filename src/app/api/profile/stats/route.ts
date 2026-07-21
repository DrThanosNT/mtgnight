import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const groupId = searchParams.get("groupId");
  const deckId = searchParams.get("deckId");
  const playedFirst = searchParams.get("playedFirst");

  const conditions: Prisma.Sql[] = [Prisma.sql`gp."userId" = ${user.id}`];
  if (groupId) conditions.push(Prisma.sql`g."groupId" = ${groupId}`);
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

  const groupsPlayed = await prisma.$queryRaw<{ id: string; name: string }[]>`
    SELECT DISTINCT gr.id, gr.name
    FROM "GamePlayer" gp
    JOIN "Game" g ON g.id = gp."gameId"
    JOIN "Group" gr ON gr.id = g."groupId"
    WHERE gp."userId" = ${user.id}
    ORDER BY gr.name ASC
  `;

  const decksUsed = await prisma.$queryRaw<{ id: string; name: string }[]>`
    SELECT DISTINCT d.id, d.name
    FROM "GamePlayer" gp
    JOIN "Deck" d ON d.id = gp."deckId"
    WHERE gp."userId" = ${user.id}
    ORDER BY d.name ASC
  `;

  const gamesPlayed = Number(rows[0]?.gamesPlayed ?? 0);
  const wins = Number(rows[0]?.wins ?? 0);

  return NextResponse.json({
    gamesPlayed,
    wins,
    winRate: gamesPlayed > 0 ? wins / gamesPlayed : 0,
    groupsPlayed,
    decksUsed,
  });
}
