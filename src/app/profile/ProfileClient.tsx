"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const FORMAT_OPTIONS = [
  { key: "COMMANDER", label: "Commander (EDH)" },
  { key: "MODERN", label: "Modern" },
  { key: "STANDARD", label: "Standard" },
  { key: "PIONEER", label: "Pioneer" },
  { key: "LEGACY", label: "Legacy" },
  { key: "VINTAGE", label: "Vintage" },
  { key: "PAUPER", label: "Pauper" },
  { key: "TWO_HEADED_GIANT", label: "Two-Headed Giant" },
  { key: "BRAWL", label: "Brawl" },
];

type Deck = { id: string; name: string; format: string };
type Option = { id: string; name: string };
type StatsResult = {
  gamesPlayed: number;
  wins: number;
  winRate: number;
  groupsPlayed: Option[];
  decksUsed: Option[];
};

export default function ProfileClient({ displayName, email }: { displayName: string; email: string }) {
  const router = useRouter();

  const [decks, setDecks] = useState<Deck[]>([]);
  const [deckName, setDeckName] = useState("");
  const [deckFormat, setDeckFormat] = useState("COMMANDER");
  const [addingDeck, setAddingDeck] = useState(false);

  const [stats, setStats] = useState<StatsResult | null>(null);
  const [groupFilter, setGroupFilter] = useState("");
  const [deckFilter, setDeckFilter] = useState("");
  const [playedFirstFilter, setPlayedFirstFilter] = useState<"" | "true" | "false">("");

  useEffect(() => {
    loadDecks();
  }, []);

  useEffect(() => {
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupFilter, deckFilter, playedFirstFilter]);

  async function loadDecks() {
    const res = await fetch("/api/decks");
    if (res.ok) setDecks((await res.json()).decks);
  }

  async function loadStats() {
    const params = new URLSearchParams();
    if (groupFilter) params.set("groupId", groupFilter);
    if (deckFilter) params.set("deckId", deckFilter);
    if (playedFirstFilter) params.set("playedFirst", playedFirstFilter);
    const res = await fetch(`/api/profile/stats?${params.toString()}`);
    if (res.ok) setStats(await res.json());
  }

  async function handleAddDeck(e: React.FormEvent) {
    e.preventDefault();
    setAddingDeck(true);
    const res = await fetch("/api/decks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: deckName, format: deckFormat }),
    });
    setAddingDeck(false);
    if (res.ok) {
      const deck = await res.json();
      setDecks((prev) => [...prev, deck].sort((a, b) => a.name.localeCompare(b.name)));
      setDeckName("");
    }
  }

  async function handleDeleteDeck(id: string) {
    if (!confirm("Delete this deck? Past games that used it keep their record, just without a deck name attached.")) return;
    await fetch(`/api/decks/${id}`, { method: "DELETE" });
    setDecks((prev) => prev.filter((d) => d.id !== id));
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: 24, color: "white" }}>
      <Link href="/dashboard" style={backLink}>← Dashboard</Link>

      <div style={{ marginTop: 12, marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>{displayName}</h1>
        <p style={{ opacity: 0.6, fontSize: 14 }}>{email}</p>
      </div>

      <section style={{ marginBottom: 32 }}>
        <h2 style={sectionHeading}>Stats across all groups</h2>

        <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
          <select value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)} style={selectStyle}>
            <option value="">All groups</option>
            {stats?.groupsPlayed.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
          <select value={deckFilter} onChange={(e) => setDeckFilter(e.target.value)} style={selectStyle}>
            <option value="">All decks</option>
            {stats?.decksUsed.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          <select
            value={playedFirstFilter}
            onChange={(e) => setPlayedFirstFilter(e.target.value as "" | "true" | "false")}
            style={selectStyle}
          >
            <option value="">Played first: any</option>
            <option value="true">Played first: yes</option>
            <option value="false">Played first: no</option>
          </select>
        </div>

        {stats && (
          <div style={statBox}>
            <span style={{ fontSize: 32, fontWeight: 700 }}>{(stats.winRate * 100).toFixed(0)}%</span>
            <span style={{ opacity: 0.6, fontSize: 13 }}>
              {stats.wins} wins / {stats.gamesPlayed} games
            </span>
          </div>
        )}
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={sectionHeading}>My decks</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
          {decks.map((d) => (
            <div key={d.id} style={deckRow}>
              <span>{d.name}</span>
              <span style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ fontSize: 12, opacity: 0.6 }}>{d.format}</span>
                <button onClick={() => handleDeleteDeck(d.id)} style={tinyDangerBtn}>Remove</button>
              </span>
            </div>
          ))}
          {decks.length === 0 && <p style={{ opacity: 0.6, fontSize: 14 }}>No decks yet.</p>}
        </div>
        <form onSubmit={handleAddDeck} style={{ display: "flex", gap: 8 }}>
          <input
            placeholder="Deck name"
            value={deckName}
            onChange={(e) => setDeckName(e.target.value)}
            required
            style={{ ...selectStyle, flex: 1 }}
          />
          <select value={deckFormat} onChange={(e) => setDeckFormat(e.target.value)} style={selectStyle}>
            {FORMAT_OPTIONS.map((f) => (
              <option key={f.key} value={f.key}>{f.label}</option>
            ))}
          </select>
          <button type="submit" disabled={addingDeck} style={ghostBtn}>
            {addingDeck ? "Adding…" : "Add"}
          </button>
        </form>
      </section>

      <button onClick={handleLogout} style={dangerBtn}>Log out</button>
    </div>
  );
}

const backLink: React.CSSProperties = { color: "#8fbf9f", fontSize: 14, textDecoration: "none" };
const sectionHeading: React.CSSProperties = { fontSize: 16, fontWeight: 600, marginBottom: 10 };
const selectStyle: React.CSSProperties = {
  padding: "8px 10px", borderRadius: 6, border: "1px solid #333",
  background: "#1a1a1a", color: "white", fontSize: 13,
};
const deckRow: React.CSSProperties = {
  display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px",
  borderRadius: 6, background: "#1a1a1a", fontSize: 14,
};
const statBox: React.CSSProperties = {
  display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
  padding: "20px 0", background: "#1a1a1a", borderRadius: 10,
};
const ghostBtn: React.CSSProperties = {
  padding: "8px 14px", borderRadius: 8, border: "1px solid #444",
  background: "transparent", color: "white", fontSize: 13, cursor: "pointer",
};
const dangerBtn: React.CSSProperties = {
  padding: "10px 16px", borderRadius: 8, border: "1px solid #7a3b3b",
  background: "transparent", color: "#e08080", fontSize: 14, cursor: "pointer",
};
const tinyDangerBtn: React.CSSProperties = {
  background: "none", border: "none", color: "#e08080", fontSize: 12, cursor: "pointer", padding: 0,
};
