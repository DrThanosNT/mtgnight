import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getActiveMembership } from "@/lib/groups";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const membership = await getActiveMembership(id, user.id);
  if (!membership) return NextResponse.json({ error: "Not a member of this group" }, { status: 403 });

  const members = await prisma.groupMember.findMany({
    where: { groupId: id, leftAt: null },
    include: { user: { select: { id: true, displayName: true } } },
  });

  return NextResponse.json({
    members: members.map((m) => ({ userId: m.user.id, displayName: m.user.displayName })),
  });
}