import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getActiveMembership } from "@/lib/groups";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const group = await prisma.group.findUnique({ where: { id } });
  if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });

  const membership = await getActiveMembership(id, user.id);
  if (!membership) return NextResponse.json({ error: "Not a member of this group" }, { status: 403 });

  const decks = await prisma.deck.findMany({
    where: { ownerId: user.id, format: group.format },
    select: { id: true, name: true, commanders: true, colorIdentity: true, cardCount: true },
  });

  return NextResponse.json({
    decks,
    message: decks.length === 0 ? `You have no imported decks for ${group.format}.` : undefined,
  });
}