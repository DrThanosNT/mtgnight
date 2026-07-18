import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const groups = await prisma.group.findMany({
    where: { members: { some: { userId: user.id, leftAt: null } } },
    include: { _count: { select: { members: { where: { leftAt: null } } } } },
  });

  return <DashboardClient displayName={user.displayName} groups={groups} />;
}
