import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getActiveMembership } from "@/lib/groups";

const COMMANDER_LIKE_FORMATS = new Set([
  "COMMANDER",
  "DUEL_COMMANDER",
  "OATHBREAKER",
  "BRAWL",
  "HISTORIC_BRAWL",
  "TINY_LEADERS",
  "ARCHENEMY_COMMANDER",
]);

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

  const showCommanders = COMMANDER_LIKE_FORMATS.has(group.format);

  const decks = await prisma.deck.findMany({
    where: { ownerId: userId, format: group.format },
    select: {
      id: true,
      name: true,
      cardCount: true,
      colorIdentity: true,
      commanders: showCommanders,
    },
  });

  return NextResponse.json({ decks });
}