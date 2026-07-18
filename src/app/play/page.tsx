"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import LifeCounterGame from "@/components/LifeCounter";

const PALETTE = [
  "#7f3b3b", "#3b5c7f", "#3b7f52", "#7f6f3b",
  "#5c3b7f", "#7f3b6c", "#3b7f7a", "#6c7f3b",
];

const FORMAT_OPTIONS: { key: string; label: string; defaultLife: number; min: number; max: number }[] = [
  { key: "COMMANDER", label: "Commander (EDH)", defaultLife: 40, min: 2, max: 6 },
  { key: "MODERN", label: "Modern", defaultLife: 20, min: 2, max: 2 },
  { key: "STANDARD", label: "Standard", defaultLife: 20, min: 2, max: 2 },
  { key: "PIONEER", label: "Pioneer", defaultLife: 20, min: 2, max: 2 },
  { key: "LEGACY", label: "Legacy", defaultLife: 20, min: 2, max: 2 },
  { key: "VINTAGE", label: "Vintage", defaultLife: 20, min: 2, max: 2 },
  { key: "PAUPER", label: "Pauper", defaultLife: 20, min: 2, max: 2 },
  { key: "TWO_HEADED_GIANT", label: "Two-Headed Giant", defaultLife: 30, min: 4, max: 4 },
  { key: "BRAWL", label: "Brawl", defaultLife: 25, min: 2, max: 4 },
];

export default function CasualPlayPage() {
  const router = useRouter();

  const [formatKey, setFormatKey] = useState("COMMANDER");
  const format = FORMAT_OPTIONS.find((f) => f.key === formatKey)!;
  const [playerCount, setPlayerCount] = useState(format.min);
  const [startingLife, setStartingLife] = useState(format.defaultLife);
  const [started, setStarted] = useState(false);

  function handleFormatChange(key: string) {
    const f = FORMAT_OPTIONS.find((x) => x.key === key)!;
    setFormatKey(key);
    setPlayerCount(f.min);
    setStartingLife(f.defaultLife);
  }

  if (started) {
    return (
      <LifeCounterGame
        mode="casual"
        startingLife={startingLife}
        initialPlayers={Array.from({ length: playerCount }, (_, i) => ({
          id: `guest-${i}`,
          name: `Player ${i + 1}`,
          color: PALETTE[i % PALETTE.length],
        }))}
        onExit={() => router.push("/dashboard")}
      />
    );
  }

  return (
    <div style={{ maxWidth: 420, margin: "0 auto", padding: 24, color: "white" }}>
      <button onClick={() => router.push("/dashboard")} style={backLink}>
        ← Dashboard
      </button>

      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16 }}>Quick game</h1>
      <p style={{ opacity: 0.7, fontSize: 14, marginBottom: 24 }}>
        No group, no stats saved — just life totals for this table.
      </p>

      <label style={{ display: "block", marginBottom: 16, fontSize: 14 }}>
        Format
        <select
          value={formatKey}
          onChange={(e) => handleFormatChange(e.target.value)}
          style={{ ...selectStyle, marginTop: 6 }}
        >
          {FORMAT_OPTIONS.map((f) => (
            <option key={f.key} value={f.key}>{f.label}</option>
          ))}
        </select>
      </label>

      <div style={{ marginBottom: 16, fontSize: 14 }}>
        Players ({format.min}–{format.max})
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

      <label style={{ display: "block", marginBottom: 24, fontSize: 14 }}>
        Starting life
        <input
          type="number"
          value={startingLife}
          onChange={(e) => setStartingLife(Number(e.target.value) || 0)}
          style={{ ...selectStyle, marginTop: 6 }}
        />
      </label>

      <button
        onClick={() => setStarted(true)}
        style={{
          width: "100%", padding: "14px 0", borderRadius: 8, border: "none",
          background: "#4a7c59", color: "white", fontSize: 16, cursor: "pointer",
        }}
      >
        Set up seating
      </button>
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  display: "block", width: "100%", padding: "10px 12px",
  borderRadius: 6, border: "none", background: "#222", color: "white", fontSize: 15,
  boxSizing: "border-box",
};

const backLink: React.CSSProperties = {
  background: "none", border: "none", color: "#8fbf9f", fontSize: 14,
  cursor: "pointer", padding: 0, marginBottom: 20,
};