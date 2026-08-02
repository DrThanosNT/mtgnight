import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getActiveMembership } from "@/lib/groups";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const { id: groupId, userId: targetUserId } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const membership = await getActiveMembership(groupId, user.id);
  if (!membership) return NextResponse.json({ error: "Not a member of this group" }, { status: 403 });

  const decksUsed = await prisma.$queryRaw<{ id: string; name: string }[]>`
    SELECT DISTINCT d.id, d.name
    FROM "GamePlayer" gp
    JOIN "Game" g ON g.id = gp."gameId"
    JOIN "Deck" d ON d.id = gp."deckId"
    WHERE g."groupId" = ${groupId} AND gp."userId" = ${targetUserId}
    ORDER BY d.name ASC
  `;

  return NextResponse.json({ decksUsed });
}
