import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function POST(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const invite = await prisma.groupInvite.findUnique({ where: { code } });
  if (!invite) return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  if (invite.expiresAt && invite.expiresAt < new Date()) {
    return NextResponse.json({ error: "Invite expired" }, { status: 410 });
  }
  if (invite.maxUses && invite.useCount >= invite.maxUses) {
    return NextResponse.json({ error: "Invite has reached its use limit" }, { status: 410 });
  }

  await prisma.$transaction([
    prisma.groupMember.upsert({
      where: { groupId_userId: { groupId: invite.groupId, userId: user.id } },
      create: { groupId: invite.groupId, userId: user.id, role: "member" },
      update: { leftAt: null },
    }),
    prisma.groupInvite.update({ where: { id: invite.id }, data: { useCount: { increment: 1 } } }),
  ]);

  return NextResponse.json({ groupId: invite.groupId });
}