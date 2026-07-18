import { prisma } from "./db";

// Returns the membership row only if the user is a *currently active*
// member. A row can still exist with leftAt set (so past games/stats stay
// correctly attributed to them), but that no longer grants group access.
export async function getActiveMembership(groupId: string, userId: string) {
  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });
  if (!membership || membership.leftAt) return null;
  return membership;
}