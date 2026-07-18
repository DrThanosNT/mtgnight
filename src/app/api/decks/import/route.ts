import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { mapMoxfieldFormat } from "@/lib/formats";

const schema = z.object({ url: z.string().url() });

function extractMoxfieldId(url: string): string | null {
  const match = url.match(/moxfield\.com\/decks\/([A-Za-z0-9_-]+)/);
  return match ? match[1] : null;
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid URL" }, { status: 400 });

  const moxfieldId = extractMoxfieldId(parsed.data.url);
  if (!moxfieldId) {
    return NextResponse.json({ error: "Not a recognizable Moxfield deck URL" }, { status: 400 });
  }

  const res = await fetch(`https://api2.moxfield.com/v3/decks/all/${moxfieldId}`, {
    headers: { "User-Agent": "mtg-tracker (contact: you@yourdomain.com)" },
  });

  if (!res.ok) {
    return NextResponse.json(
      { error: `Moxfield returned ${res.status}. Deck may be private or the ID is wrong.` },
      { status: 502 }
    );
  }

  const data = await res.json();

  const commanderNames: string[] = data.commanders
    ? Object.values(data.commanders).map((c: any) => c.card?.name).filter(Boolean)
    : [];
  const colorIdentity: string[] = data.colorIdentity ?? [];
  const cardCount = data.mainboard
    ? Object.values(data.mainboard).reduce((sum: number, e: any) => sum + (e.quantity ?? 0), 0)
    : null;

  const formatRaw: string | undefined = data.format;
  const mappedFormat = mapMoxfieldFormat(formatRaw);
  if (formatRaw && !mappedFormat) {
    console.warn(`Unmapped Moxfield format string: "${formatRaw}"`);
  }

  const deck = await prisma.deck.create({
    data: {
      ownerId: user.id,
      name: data.name ?? "Imported deck",
      format: mappedFormat as any,
      formatRaw: formatRaw ?? null,
      moxfieldId,
      moxfieldUrl: parsed.data.url,
      commanders: commanderNames,
      colorIdentity,
      cardCount,
      rawData: data,
    },
  });

  return NextResponse.json(deck);
}
