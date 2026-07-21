import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

const SCRYFALL_HEADERS = {
  "User-Agent": "mtg-night/1.0 (contact: you@yourdomain.com)",
  "Accept": "application/json;q=0.9,*/*;q=0.8",
};

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  if (!q || q.length < 2) return NextResponse.json({ results: [] });

  const res = await fetch(
    `https://api.scryfall.com/cards/search?q=${encodeURIComponent(q)}&unique=cards&order=name`,
    { headers: SCRYFALL_HEADERS }
  );

  if (!res.ok) {
    if (res.status === 404) return NextResponse.json({ results: [] });
    return NextResponse.json({ error: "Card search failed" }, { status: 502 });
  }

  const data = await res.json();

  const results = (data.data ?? [])
    .slice(0, 20)
    .map((card: any) => {
      const artCrop =
        card.image_uris?.art_crop ?? card.card_faces?.[0]?.image_uris?.art_crop ?? null;
      return artCrop ? { name: card.name, imageUrl: artCrop } : null;
    })
    .filter(Boolean);

  return NextResponse.json({ results });
}
