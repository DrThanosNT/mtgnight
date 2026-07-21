import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifyPassword, createSession } from "@/lib/auth";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 60 * 1000;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const { email, password } = parsed.data;

  const attempt = await prisma.loginAttempt.findUnique({ where: { email } });

  if (attempt?.lockedUntil && attempt.lockedUntil > new Date()) {
    const secondsLeft = Math.ceil((attempt.lockedUntil.getTime() - Date.now()) / 1000);
    return NextResponse.json(
      { error: `Too many attempts. Try again in ${secondsLeft}s.` },
      { status: 429 }
    );
  }

  const user = await prisma.user.findUnique({ where: { email } });
  const valid = user ? await verifyPassword(password, user.passwordHash) : false;

  if (!valid) {
    const nextCount = (attempt?.failedCount ?? 0) + 1;
    await prisma.loginAttempt.upsert({
      where: { email },
      create: {
        email,
        failedCount: 1,
        lockedUntil: nextCount >= MAX_ATTEMPTS ? new Date(Date.now() + LOCKOUT_MS) : null,
      },
      update: {
        failedCount: nextCount,
        lockedUntil: nextCount >= MAX_ATTEMPTS ? new Date(Date.now() + LOCKOUT_MS) : null,
      },
    });

    // Deliberately vague error to avoid leaking whether the email exists
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  // Successful login - clear any tracked failures for this email
  if (attempt) {
    await prisma.loginAttempt.delete({ where: { email } }).catch(() => {});
  }

  await createSession(user!.id);

  return NextResponse.json({ id: user!.id, email: user!.email, displayName: user!.displayName });
}