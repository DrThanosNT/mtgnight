import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getActiveMembership } from "@/lib/groups";
import GroupDetailClient from "./GroupDetailClient";

export default async function GroupDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const group = await prisma.group.findUnique({ where: { id } });
  if (!group) notFound();

  const membership = await getActiveMembership(id, user.id);
  if (!membership) redirect("/dashboard");

  const members = await prisma.groupMember.findMany({
    where: { groupId: id, leftAt: null },
    include: { user: { select: { id: true, displayName: true } } },
    orderBy: { joinedAt: "asc" },
  });

  const myDecks = await prisma.deck.findMany({
    where: { ownerId: user.id, format: group.format },
    select: { id: true, name: true, commanders: true, cardCount: true },
  });

  return (
    <GroupDetailClient
      group={{ id: group.id, name: group.name, format: group.format, playerCount: group.playerCount }}
      members={members.map((m) => ({
        userId: m.user.id,
        displayName: m.user.displayName,
        isOwner: m.role === "owner",
        isMe: m.user.id === user.id,
      }))}
      myDecks={myDecks}
      isOwner={membership.role === "owner"}
    />
  );
}