import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { FORMAT_KEYS } from "@/lib/formats";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format");
  const q = searchParams.get("q");

  const decks = await prisma.deck.findMany({
    where: {
      ownerId: user.id,
      ...(format ? { format: format as any } : {}),
      ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ decks });
}

const createSchema = z.object({
  name: z.string().min(1).max(80),
  format: z.enum(FORMAT_KEYS as [string, ...string[]]),
});

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const deck = await prisma.deck.create({
    data: { ownerId: user.id, name: parsed.data.name, format: parsed.data.format as any },
  });

  return NextResponse.json(deck);
}
