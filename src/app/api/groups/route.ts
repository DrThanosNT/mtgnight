import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { FORMAT_KEYS, FORMATS } from "@/lib/formats";

const schema = z.object({
  name: z.string().min(1).max(60),
  format: z.enum(FORMAT_KEYS as [string, ...string[]]),
  playerCount: z.number().int().positive(),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const groups = await prisma.group.findMany({
    where: { members: { some: { userId: user.id, leftAt: null } } },
    include: { _count: { select: { members: true } } },
  });

  return NextResponse.json(groups);
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { name, format, playerCount } = parsed.data;
  const meta = FORMATS[format as keyof typeof FORMATS];
  if (playerCount < meta.minPlayers || playerCount > meta.maxPlayers) {
    return NextResponse.json(
      { error: `${meta.label} supports ${meta.minPlayers}-${meta.maxPlayers} players` },
      { status: 400 }
    );
  }

  const group = await prisma.group.create({
    data: {
      name,
      ownerId: user.id,
      format: format as any,
      playerCount,
      members: { create: { userId: user.id, role: "owner" } },
    },
  });

  return NextResponse.json(group);
}
