import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const groupId = searchParams.get("groupId");
  const playedFirst = searchParams.get("playedFirst");

  const conditions: Prisma.Sql[] = [
    Prisma.sql`gp."userId" = ${user.id}`,
    Prisma.sql`g."turnCount" IS NOT NULL`,
  ];
  if (groupId) conditions.push(Prisma.sql`g."groupId" = ${groupId}`);
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

  return NextResponse.json({ total, turns });
}
