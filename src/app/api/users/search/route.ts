import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  if (!q || q.length < 2) return NextResponse.json({ results: [] });

  const users = await prisma.user.findMany({
    where: { username: { not: null, contains: q, mode: "insensitive" } },
    select: { username: true, displayName: true },
    take: 10,
  });

  return NextResponse.json({ results: users });
}
