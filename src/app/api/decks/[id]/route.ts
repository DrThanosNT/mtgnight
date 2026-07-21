import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const deck = await prisma.deck.findUnique({ where: { id } });
  if (!deck || deck.ownerId !== user.id) {
    return NextResponse.json({ error: "Deck not found" }, { status: 404 });
  }

  await prisma.deck.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const deck = await prisma.deck.findUnique({ where: { id } });
  if (!deck || deck.ownerId !== user.id) {
    return NextResponse.json({ error: "Deck not found" }, { status: 404 });
  }

  const body = await req.json();
  const updated = await prisma.deck.update({
    where: { id },
    data: {
      backgroundImageUrl: body.backgroundImageUrl ?? null,
      backgroundCardName: body.backgroundCardName ?? null,
    },
  });

  return NextResponse.json(updated);
}
