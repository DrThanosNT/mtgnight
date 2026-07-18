import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getActiveMembership } from "@/lib/groups";
import { FORMATS } from "@/lib/formats";

const schema = z.object({
  startingLife: z.number().int().positive().optional(),
  turnCount: z.number().int().positive().optional(),
  players: z
    .array(
      z.object({
        userId: z.string(),
        deckId: z.string().optional(),
        seatOrder: z.number().int().nonnegative(),
        finalLife: z.number().int(),
        isWinner: z.boolean().default(false),
        eliminationTurn: z.number().int().optional(),
      })
    )
    .min(2),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: groupId } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });

  const membership = await getActiveMembership(groupId, user.id);
  if (!membership) return NextResponse.json({ error: "Not a member of this group" }, { status: 403 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { players, turnCount } = parsed.data;
  const startingLife = parsed.data.startingLife ?? FORMATS[group.format as keyof typeof FORMATS].defaultLife;

  if (players.length !== group.playerCount) {
    return NextResponse.json(
      { error: `This group plays ${group.playerCount}-player games, got ${players.length}` },
      { status: 400 }
    );
  }

  const activeMemberIds = new Set(
    (
      await prisma.groupMember.findMany({
        where: { groupId, leftAt: null },
        select: { userId: true },
      })
    ).map((m) => m.userId)
  );
  const invalidPlayer = players.find((p) => !activeMemberIds.has(p.userId));
  if (invalidPlayer) {
    return NextResponse.json(
      { error: `User ${invalidPlayer.userId} is not a current member of this group` },
      { status: 400 }
    );
  }

  const deckIds = players.map((p) => p.deckId).filter(Boolean) as string[];
  if (deckIds.length > 0) {
    const decks = await prisma.deck.findMany({ where: { id: { in: deckIds } } });
    for (const p of players) {
      if (!p.deckId) continue;
      const deck = decks.find((d) => d.id === p.deckId);
      if (!deck || deck.ownerId !== p.userId) {
        return NextResponse.json({ error: `Invalid deck for user ${p.userId}` }, { status: 400 });
      }
      if (deck.format !== group.format) {
        return NextResponse.json({ error: `Deck "${deck.name}" is not a ${group.format} deck` }, { status: 400 });
      }
    }
  }

  const game = await prisma.game.create({
    data: {
      groupId,
      format: group.format,
      startingLife,
      turnCount,
      endedAt: new Date(),
      players: {
        create: players.map((p) => ({
          userId: p.userId,
          deckId: p.deckId,
          seatOrder: p.seatOrder,
          startingLife,
          finalLife: p.finalLife,
          isWinner: p.isWinner,
          eliminationTurn: p.eliminationTurn,
        })),
      },
    },
    include: { players: true },
  });

  return NextResponse.json(game);
}