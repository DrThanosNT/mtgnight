import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getActiveMembership } from "@/lib/groups";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const { id, userId } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const group = await prisma.group.findUnique({ where: { id } });
  if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });

  const callerMembership = await getActiveMembership(id, user.id);
  if (!callerMembership) return NextResponse.json({ error: "Not a member of this group" }, { status: 403 });

  const targetMembership = await getActiveMembership(id, userId);
  if (!targetMembership) return NextResponse.json({ error: "That user is not an active member" }, { status: 404 });

  const decks = await prisma.deck.findMany({
    where: { ownerId: userId, format: group.format },
    select: { id: true, name: true, backgroundImageUrl: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ decks });
}
