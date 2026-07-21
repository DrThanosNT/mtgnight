import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getActiveMembership } from "@/lib/groups";
import StatsClient from "./StatsClient";

export default async function GroupStatsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const group = await prisma.group.findUnique({ where: { id } });
  if (!group) notFound();

  const membership = await getActiveMembership(id, user.id);
  if (!membership) redirect("/dashboard");

  return <StatsClient groupId={id} groupName={group.name} />;
}
