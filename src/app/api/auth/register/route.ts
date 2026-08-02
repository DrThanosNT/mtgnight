import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword, createSession } from "@/lib/auth";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(1).max(40),
  username: z.string().regex(/^[a-z0-9_]{3,24}$/, "3-24 chars: lowercase letters, numbers, underscores"),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { email, password, displayName, username } = parsed.data;

  const existingEmail = await prisma.user.findUnique({ where: { email } });
  if (existingEmail) return NextResponse.json({ error: "Email already in use" }, { status: 409 });

  const existingUsername = await prisma.user.findUnique({ where: { username } });
  if (existingUsername) return NextResponse.json({ error: "Username already taken" }, { status: 409 });

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { email, passwordHash, displayName, username },
  });

  await createSession(user.id);

  return NextResponse.json({ id: user.id, email: user.email, displayName: user.displayName, username: user.username });
}
