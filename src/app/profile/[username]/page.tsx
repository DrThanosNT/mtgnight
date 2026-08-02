import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import PublicProfileClient from "./PublicProfileClient";

export default async function PublicProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const viewer = await getCurrentUser();
  if (!viewer) redirect("/login");

  const target = await prisma.user.findUnique({ where: { username } });
  if (!target) notFound();

  return <PublicProfileClient displayName={target.displayName} username={target.username!} />;
}
