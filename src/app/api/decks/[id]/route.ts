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
  const data: Record<string, string | null> = {};

  // Each field only gets touched if the caller actually sent it - lets the
  // background picker PATCH independently of the commander-edit form
  // without either one accidentally wiping the other's data.
  if ("backgroundImageUrl" in body) data.backgroundImageUrl = body.backgroundImageUrl ?? null;
  if ("backgroundCardName" in body) data.backgroundCardName = body.backgroundCardName ?? null;
  if ("commanderName" in body) data.commanderName = body.commanderName?.trim() || null;
  if ("partnerName" in body) data.partnerName = body.partnerName?.trim() || null;

  const updated = await prisma.deck.update({ where: { id }, data });
  return NextResponse.json(updated);
}
