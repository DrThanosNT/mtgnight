"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const FORMAT_OPTIONS = [
  { key: "COMMANDER", label: "Commander (EDH)", min: 2, max: 6 },
  { key: "MODERN", label: "Modern", min: 2, max: 2 },
  { key: "STANDARD", label: "Standard", min: 2, max: 2 },
  { key: "PIONEER", label: "Pioneer", min: 2, max: 2 },
  { key: "LEGACY", label: "Legacy", min: 2, max: 2 },
  { key: "PAUPER", label: "Pauper", min: 2, max: 2 },
  { key: "TWO_HEADED_GIANT", label: "Two-Headed Giant", min: 4, max: 4 },
  { key: "BRAWL", label: "Brawl", min: 2, max: 4 },
];

type Group = { id: string; name: string; format: string; playerCount: number; _count: { members: number } };

export default function DashboardClient({
  displayName,
  groups,
}: {
  displayName: string;
  groups: Group[];
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [formatKey, setFormatKey] = useState("COMMANDER");
  const format = FORMAT_OPTIONS.find((f) => f.key === formatKey)!;
  const [playerCount, setPlayerCount] = useState(format.min);
  const [error, setError] = useState<string | null>(null);

  function handleFormatChange(key: string) {
    const f = FORMAT_OPTIONS.find((x) => x.key === key)!;
    setFormatKey(key);
    setPlayerCount(f.min);
  }

  async function handleCreateGroup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, format: formatKey, playerCount }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "Couldn't create group");
      return;
    }
    const group = await res.json();
    router.push(`/groups/${group.id}`);
  }

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: 24, color: "white" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>Hey, {displayName}</h1>
        <Link href="/profile" style={ghostBtn}>Profile</Link>
      </div>

      <Link
        href="/play"
        style={{ ...primaryBtn, display: "block", textAlign: "center", textDecoration: "none", marginBottom: 32 }}
      >
        Quick game (no group, no stats)
      </Link>

      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>Your groups</h2>
      {groups.length === 0 && <p style={{ opacity: 0.7, marginBottom: 16 }}>You're not in any groups yet.</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
        {groups.map((g) => (
          <Link
            key={g.id}
            href={`/groups/${g.id}`}
            style={{
              display: "flex", justifyContent: "space-between", padding: "12px 16px",
              borderRadius: 8, background: "#1a1a1a", color: "white", textDecoration: "none",
            }}
          >
            <span>{g.name}</span>
            <span style={{ opacity: 0.6, fontSize: 14 }}>
              {g.format} · {g._count.members} members
            </span>
          </Link>
        ))}
      </div>

      {!creating ? (
        <button onClick={() => setCreating(true)} style={ghostBtn}>+ New group</button>
      ) : (
        <form onSubmit={handleCreateGroup} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <input
            placeholder="Group name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            style={input}
          />

          <label style={{ fontSize: 14 }}>
            Format
            <select
              value={formatKey}
              onChange={(e) => handleFormatChange(e.target.value)}
              style={{ ...input, marginTop: 6 }}
            >
              {FORMAT_OPTIONS.map((f) => (
                <option key={f.key} value={f.key}>{f.label}</option>
              ))}
            </select>
          </label>

          <div style={{ fontSize: 14 }}>
            Player count ({format.min}–{format.max})
            <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
              {Array.from({ length: format.max - format.min + 1 }, (_, i) => format.min + i).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setPlayerCount(n)}
                  style={{
                    padding: "8px 14px", borderRadius: 6, border: "1px solid #444",
                    background: playerCount === n ? "#4a7c59" : "transparent",
                    color: "white", cursor: "pointer",
                  }}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {error && <p style={{ color: "#e08080", fontSize: 14 }}>{error}</p>}

          <div style={{ display: "flex", gap: 8 }}>
            <button type="submit" style={primaryBtn}>Create</button>
            <button type="button" onClick={() => setCreating(false)} style={ghostBtn}>Cancel</button>
          </div>
        </form>
      )}
    </div>
  );
}

const input: React.CSSProperties = {
  padding: "10px 12px", borderRadius: 6, border: "1px solid #333",
  background: "#1a1a1a", color: "white", fontSize: 15, width: "100%", boxSizing: "border-box",
};
const primaryBtn: React.CSSProperties = {
  padding: "10px 16px", borderRadius: 8, border: "none",
  background: "#4a7c59", color: "white", fontSize: 15, cursor: "pointer",
};
const ghostBtn: React.CSSProperties = {
  padding: "10px 16px", borderRadius: 8, border: "1px solid #444",
  background: "transparent", color: "white", fontSize: 15, cursor: "pointer", textDecoration: "none",
};