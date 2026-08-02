import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json();
  const username = String(body.username ?? "").trim().toLowerCase();

  if (!/^[a-z0-9_]{3,24}$/.test(username)) {
    return NextResponse.json({ error: "3-24 chars: lowercase letters, numbers, underscores only." }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing && existing.id !== user.id) {
    return NextResponse.json({ error: "That username is taken." }, { status: 409 });
  }

  await prisma.user.update({ where: { id: user.id }, data: { username } });
  return NextResponse.json({ username });
}
