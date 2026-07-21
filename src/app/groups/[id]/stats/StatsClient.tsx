"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type PlayerRow = { userId: string; displayName: string; gamesPlayed: number; wins: number; winRate: number };
type MemberStats = { gamesPlayed: number; wins: number; winRate: number; decksUsed: { id: string; name: string }[] };
type TurnRow = { turn: number; count: number; percent: number };

export default function StatsClient({ groupId, groupName }: { groupId: string; groupName: string }) {
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/groups/${groupId}/stats`)
      .then((r) => r.json())
      .then((data) => setPlayers(data.players ?? []))
      .finally(() => setLoading(false));
  }, [groupId]);

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: 24, color: "white" }}>
      <Link href={`/groups/${groupId}`} style={backLink}>← {groupName}</Link>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginTop: 12, marginBottom: 20 }}>{groupName} — stats</h1>

      {loading && <p style={{ opacity: 0.6 }}>Loading…</p>}
      {!loading && players.length === 0 && <p style={{ opacity: 0.6 }}>No games recorded yet.</p>}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {players.map((p) => (
          <MemberRow
            key={p.userId}
            groupId={groupId}
            player={p}
            expanded={expanded === p.userId}
            onToggle={() => setExpanded(expanded === p.userId ? null : p.userId)}
          />
        ))}
      </div>

      <TurnsSection groupId={groupId} players={players} />
    </div>
  );
}

function MemberRow({
  groupId,
  player,
  expanded,
  onToggle,
}: {
  groupId: string;
  player: PlayerRow;
  expanded: boolean;
  onToggle: () => void;
}) {
  const [deckFilter, setDeckFilter] = useState("");
  const [playedFirstFilter, setPlayedFirstFilter] = useState<"" | "true" | "false">("");
  const [filtered, setFiltered] = useState<MemberStats | null>(null);

  useEffect(() => {
    if (!expanded) return;
    const params = new URLSearchParams();
    if (deckFilter) params.set("deckId", deckFilter);
    if (playedFirstFilter) params.set("playedFirst", playedFirstFilter);
    fetch(`/api/groups/${groupId}/members/${player.userId}/stats?${params.toString()}`)
      .then((r) => r.json())
      .then(setFiltered);
  }, [expanded, deckFilter, playedFirstFilter, groupId, player.userId]);

  return (
    <div style={{ background: "#1a1a1a", borderRadius: 10, overflow: "hidden" }}>
      <button onClick={onToggle} style={memberButton}>
        <span>{player.displayName}</span>
        <span style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
          <span style={{ fontSize: 12, opacity: 0.5 }}>{player.gamesPlayed} games</span>
          <span style={{ fontSize: 15, fontWeight: 700 }}>{(player.winRate * 100).toFixed(0)}%</span>
        </span>
      </button>

      {expanded && (
        <div style={{ padding: "12px 14px", borderTop: "1px solid #262b35" }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
            <select value={deckFilter} onChange={(e) => setDeckFilter(e.target.value)} style={selectStyle}>
              <option value="">All decks</option>
              {filtered?.decksUsed.map((d) => (
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
          {filtered && (
            <p style={{ fontSize: 14 }}>
              <strong>{(filtered.winRate * 100).toFixed(0)}%</strong> win rate — {filtered.wins} wins / {filtered.gamesPlayed} games
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function TurnsSection({ groupId, players }: { groupId: string; players: PlayerRow[] }) {
  const [winnerId, setWinnerId] = useState("");
  const [deckIds, setDeckIds] = useState<string[]>([]);
  const [playedFirstFilter, setPlayedFirstFilter] = useState<"" | "true" | "false">("");
  const [decksOfWinner, setDecksOfWinner] = useState<{ id: string; name: string }[]>([]);
  const [data, setData] = useState<{ mode: string; total: number; turns: TurnRow[] } | null>(null);

  useEffect(() => {
    if (!winnerId) {
      setDecksOfWinner([]);
      setDeckIds([]);
      return;
    }
    fetch(`/api/groups/${groupId}/members/${winnerId}/stats`)
      .then((r) => r.json())
      .then((d) => setDecksOfWinner(d.decksUsed ?? []));
  }, [winnerId, groupId]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (winnerId) {
      params.set("winnerId", winnerId);
      deckIds.forEach((id) => params.append("deckId", id));
      if (playedFirstFilter) params.set("playedFirst", playedFirstFilter);
    }
    fetch(`/api/groups/${groupId}/stats/turns?${params.toString()}`)
      .then((r) => r.json())
      .then(setData);
  }, [groupId, winnerId, deckIds, playedFirstFilter]);

  return (
    <section style={{ marginTop: 32 }}>
      <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 10 }}>
        Turns games ended on
      </h2>

      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <select value={winnerId} onChange={(e) => setWinnerId(e.target.value)} style={selectStyle}>
          <option value="">All games</option>
          {players.map((p) => (
            <option key={p.userId} value={p.userId}>Filter by who won: {p.displayName}</option>
          ))}
        </select>
        {winnerId && (
          <>
            <select
              multiple
              value={deckIds}
              onChange={(e) => setDeckIds(Array.from(e.target.selectedOptions, (o) => o.value))}
              style={{ ...selectStyle, minWidth: 140 }}
            >
              {decksOfWinner.map((d) => (
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
          </>
        )}
      </div>

      {!data && <p style={{ opacity: 0.6, fontSize: 14 }}>Loading…</p>}
      {data && data.turns.length === 0 && <p style={{ opacity: 0.6, fontSize: 14 }}>No games with a recorded turn count yet.</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {data?.turns.map((t) => (
          <div key={t.turn} style={{ display: "flex", alignItems: "center", gap: 10, background: "#1a1a1a", borderRadius: 6, padding: "8px 12px" }}>
            <span style={{ fontSize: 13, width: 56, flexShrink: 0 }}>Turn {t.turn}</span>
            <div style={{ flex: 1, height: 6, background: "#262b35", borderRadius: 3, overflow: "hidden" }}>
              <div style={{ width: `${t.percent}%`, height: "100%", background: "#c9a227" }} />
            </div>
            <span style={{ fontSize: 13, width: 44, textAlign: "right", flexShrink: 0 }}>{t.percent.toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </section>
  );
}

const backLink: React.CSSProperties = { color: "#8fbf9f", fontSize: 14, textDecoration: "none" };
const memberButton: React.CSSProperties = {
  width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center",
  padding: "12px 14px", background: "transparent", border: "none", color: "white", cursor: "pointer", fontSize: 14,
};
const selectStyle: React.CSSProperties = {
  padding: "8px 10px", borderRadius: 6, border: "1px solid #333",
  background: "#111", color: "white", fontSize: 13,
};