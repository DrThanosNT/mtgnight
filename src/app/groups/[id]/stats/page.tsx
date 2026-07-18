import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getActiveMembership } from "@/lib/groups";

export default async function GroupStatsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const group = await prisma.group.findUnique({ where: { id } });
  if (!group) notFound();

  const membership = await getActiveMembership(id, user.id);
  if (!membership) redirect("/dashboard");

  const groupId = id;

  const perPlayer = await prisma.$queryRaw<{ userId: string; displayName: string; gamesPlayed: bigint; wins: bigint }[]>`
    SELECT gp."userId", u."displayName", COUNT(*)::bigint AS "gamesPlayed",
           SUM(CASE WHEN gp."isWinner" THEN 1 ELSE 0 END)::bigint AS wins
    FROM "GamePlayer" gp
    JOIN "Game" g ON g.id = gp."gameId"
    JOIN "User" u ON u.id = gp."userId"
    WHERE g."groupId" = ${groupId}
    GROUP BY gp."userId", u."displayName"
    ORDER BY wins DESC
  `;

  const bySeat = await prisma.$queryRaw<{ seatOrder: number; gamesPlayed: bigint; wins: bigint }[]>`
    SELECT gp."seatOrder", COUNT(*)::bigint AS "gamesPlayed",
           SUM(CASE WHEN gp."isWinner" THEN 1 ELSE 0 END)::bigint AS wins
    FROM "GamePlayer" gp
    JOIN "Game" g ON g.id = gp."gameId"
    WHERE g."groupId" = ${groupId}
    GROUP BY gp."seatOrder"
    ORDER BY gp."seatOrder" ASC
  `;

  const byDeck = await prisma.$queryRaw<{ deckId: string; deckName: string; gamesPlayed: bigint; wins: bigint }[]>`
    SELECT gp."deckId", d.name AS "deckName", COUNT(*)::bigint AS "gamesPlayed",
           SUM(CASE WHEN gp."isWinner" THEN 1 ELSE 0 END)::bigint AS wins
    FROM "GamePlayer" gp
    JOIN "Game" g ON g.id = gp."gameId"
    JOIN "Deck" d ON d.id = gp."deckId"
    WHERE g."groupId" = ${groupId} AND gp."deckId" IS NOT NULL
    GROUP BY gp."deckId", d.name
    ORDER BY wins DESC
  `;

  const rate = (wins: bigint, games: bigint) => (Number(games) > 0 ? ((Number(wins) / Number(games)) * 100).toFixed(0) : "0");

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: 24, color: "white" }}>
      <Link href={`/groups/${groupId}`} style={backLink}>← {group.name}</Link>

      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4, marginTop: 12 }}>{group.name} — stats</h1>
      <p style={{ opacity: 0.6, fontSize: 13, marginBottom: 24 }}>
        Includes everyone who's ever played here, even members who've since left.
      </p>

      <Section title="Win rate by player">
        {perPlayer.length === 0 && <Empty />}
        {perPlayer.map((r) => (
          <Row key={r.userId} label={r.displayName} value={`${rate(r.wins, r.gamesPlayed)}%`} sub={`${r.gamesPlayed} games`} />
        ))}
      </Section>

      <Section title="Win rate by seat order (does going first matter?)">
        {bySeat.length === 0 && <Empty />}
        {bySeat.map((r) => (
          <Row
            key={r.seatOrder}
            label={r.seatOrder === 0 ? "Played first" : `Seat ${r.seatOrder + 1}`}
            value={`${rate(r.wins, r.gamesPlayed)}%`}
            sub={`${r.gamesPlayed} games`}
          />
        ))}
      </Section>

      <Section title="Win rate by deck">
        {byDeck.length === 0 && <Empty />}
        {byDeck.map((r) => (
          <Row key={r.deckId} label={r.deckName} value={`${rate(r.wins, r.gamesPlayed)}%`} sub={`${r.gamesPlayed} games`} />
        ))}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 28 }}>
      <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 10 }}>{title}</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>{children}</div>
    </section>
  );
}

function Row({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", borderRadius: 6, background: "#1a1a1a" }}>
      <span style={{ fontSize: 14 }}>{label}</span>
      <span style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
        <span style={{ fontSize: 12, opacity: 0.5 }}>{sub}</span>
        <span style={{ fontSize: 15, fontWeight: 700 }}>{value}</span>
      </span>
    </div>
  );
}

function Empty() {
  return <p style={{ opacity: 0.6, fontSize: 14 }}>No games recorded yet.</p>;
}

const backLink: React.CSSProperties = {
  color: "#8fbf9f", fontSize: 14, textDecoration: "none", display: "inline-block",
};
