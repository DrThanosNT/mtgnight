"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";

type Option = { id: string; name: string };
type SeatStat = { seat: number; gamesPlayed: number; wins: number; winRate: number };
type TurnStat = { turn: number; count: number; percent: number };
type StatsResult = {
  gamesPlayed: number; wins: number; winRate: number;
  groupsPlayed: Option[]; decksUsed: Option[]; seatWins: SeatStat[]; turns: TurnStat[];
};

export default function PublicProfileClient({ displayName }: { displayName: string }) {
  const [stats, setStats] = useState<StatsResult | null>(null);
  const [groupFilter, setGroupFilter] = useState("");
  const [deckFilter, setDeckFilter] = useState("");
  const [seatFilter, setSeatFilter] = useState("");

  useEffect(() => {
    const params = new URLSearchParams();
    if (groupFilter) params.set("groupId", groupFilter);
    if (deckFilter) params.set("deckId", deckFilter);
    if (seatFilter) params.set("seat", seatFilter);
    fetch(`/api/users/${encodeURIComponent(displayName)}/stats?${params.toString()}`)
      .then((r) => r.json())
      .then(setStats);
  }, [displayName, groupFilter, deckFilter, seatFilter]);

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: 24, color: "white" }}>
      <Sidebar />
      <div style={{ marginTop: 12, marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>{displayName}</h1>
      </div>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 10 }}>Filter</h2>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <select value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)} style={selectStyle}>
            <option value="">All groups</option>
            {stats?.groupsPlayed.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          <select value={deckFilter} onChange={(e) => setDeckFilter(e.target.value)} style={selectStyle}>
            <option value="">All decks</option>
            {stats?.decksUsed.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <select value={seatFilter} onChange={(e) => setSeatFilter(e.target.value)} style={selectStyle}>
            <option value="">Any seat</option>
            {Array.from({ length: 6 }, (_, i) => i + 1).map((s) => <option key={s} value={s}>Seat {s}</option>)}
          </select>
        </div>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 10 }}>Win rate</h2>
        {stats && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "20px 0", background: "#1a1a1a", borderRadius: 10 }}>
            <span style={{ fontSize: 32, fontWeight: 700 }}>{(stats.winRate * 100).toFixed(0)}%</span>
            <span style={{ opacity: 0.6, fontSize: 13 }}>{stats.wins} wins / {stats.gamesPlayed} games</span>
          </div>
        )}
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 10 }}>Win rate by seat</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {stats?.seatWins.map((s) => <BarRow key={s.seat} label={`Seat ${s.seat}`} percent={s.winRate * 100} sub={`${s.gamesPlayed} games`} />)}
        </div>
      </section>

      <section>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 10 }}>Turns games ended on</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {stats?.turns.map((t) => <BarRow key={t.turn} label={`Turn ${t.turn}`} percent={t.percent} sub={`${t.count} games`} />)}
        </div>
      </section>
    </div>
  );
}

function BarRow({ label, percent, sub }: { label: string; percent: number; sub: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#1a1a1a", borderRadius: 6, padding: "8px 12px" }}>
      <span style={{ fontSize: 13, width: 70, flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: 6, background: "#262b35", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ width: `${percent}%`, height: "100%", background: "#c9a227" }} />
      </div>
      <span style={{ fontSize: 12, opacity: 0.6, width: 60, textAlign: "right", flexShrink: 0 }}>{sub}</span>
      <span style={{ fontSize: 13, width: 40, textAlign: "right", flexShrink: 0 }}>{percent.toFixed(0)}%</span>
    </div>
  );
}

const selectStyle: React.CSSProperties = { padding: "8px 10px", borderRadius: 6, border: "1px solid #333", background: "#1a1a1a", color: "white", fontSize: 13 };
