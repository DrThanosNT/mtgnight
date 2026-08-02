"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Member = { userId: string; displayName: string; username: string | null };
type PlayerStat = { userId: string; displayName: string; gamesPlayed: number; wins: number; winRate: number };
type SeatStat = { seat: number; gamesPlayed: number; wins: number; winRate: number };
type TurnStat = { turn: number; count: number; percent: number };
type Deck = { id: string; name: string };

export default function StatsClient({ groupId, groupName }: { groupId: string; groupName: string }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [playerCount, setPlayerCount] = useState(4);
  const [loading, setLoading] = useState(true);

  const [participantFilter, setParticipantFilter] = useState<Set<string>>(new Set());
  const [deckFilter, setDeckFilter] = useState<{ userId: string; deckId: string; deckName: string } | null>(null);
  const [deckPickerFor, setDeckPickerFor] = useState<string | null>(null);
  const [deckOptions, setDeckOptions] = useState<Deck[]>([]);
  const [seatAssignments, setSeatAssignments] = useState<Record<number, string>>({});

  const [players, setPlayers] = useState<PlayerStat[]>([]);
  const [seatWins, setSeatWins] = useState<SeatStat[]>([]);
  const [turns, setTurns] = useState<TurnStat[]>([]);

  useEffect(() => {
    Promise.all([
      fetch(`/api/groups/${groupId}`).then((r) => r.json()),
      fetch(`/api/groups/${groupId}/members`).then((r) => r.json()),
    ]).then(([groupData, membersData]) => {
      setPlayerCount(groupData.playerCount ?? 4);
      setMembers(membersData.members ?? []);
    });
  }, [groupId]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    participantFilter.forEach((id) => params.append("playerId", id));
    if (deckFilter) {
      params.set("deckUserId", deckFilter.userId);
      params.set("deckId", deckFilter.deckId);
    }
    Object.entries(seatAssignments).forEach(([seat, uid]) => {
      if (uid) params.append("seat", `${uid}:${seat}`);
    });
    fetch(`/api/groups/${groupId}/stats?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        setPlayers(data.players ?? []);
        setSeatWins(data.seatWins ?? []);
        setTurns(data.turns ?? []);
      })
      .finally(() => setLoading(false));
  }, [groupId, participantFilter, deckFilter, seatAssignments]);

  function toggleParticipant(userId: string) {
    setParticipantFilter((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
        setSeatAssignments((sa) => {
          const copy = { ...sa };
          for (const seat of Object.keys(copy)) {
            if (copy[Number(seat)] === userId) delete copy[Number(seat)];
          }
          return copy;
        });
        if (deckFilter?.userId === userId) setDeckFilter(null);
      } else {
        next.add(userId);
      }
      return next;
    });
  }

  async function openDeckPicker(userId: string) {
    if (deckPickerFor === userId) {
      setDeckPickerFor(null);
      return;
    }
    setDeckPickerFor(userId);
    const res = await fetch(`/api/groups/${groupId}/members/${userId}/stats`);
    if (res.ok) setDeckOptions((await res.json()).decksUsed ?? []);
  }

  function selectDeck(userId: string, deckId: string, deckName: string) {
    setDeckFilter({ userId, deckId, deckName });
    setDeckPickerFor(null);
  }

  const seatPool = participantFilter.size > 0 ? members.filter((m) => participantFilter.has(m.userId)) : members;
  const assignedElsewhere = (seat: number) =>
    new Set(Object.entries(seatAssignments).filter(([s]) => Number(s) !== seat).map(([, uid]) => uid));

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: 24, color: "white" }}>
      <Link href={`/groups/${groupId}`} style={backLink}>← {groupName}</Link>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginTop: 12, marginBottom: 20 }}>{groupName} — stats</h1>

      <section style={{ marginBottom: 24 }}>
        <h2 style={sectionHeading}>Who played</h2>
        <p style={hint}>Select players for an exact match — games with anyone else, or missing someone selected, are excluded.</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
          {members.map((m) => {
            const selected = participantFilter.has(m.userId);
            return (
              <button key={m.userId} onClick={() => toggleParticipant(m.userId)} style={pill(selected)}>
                {m.displayName}
              </button>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={() => setParticipantFilter(new Set(members.map((m) => m.userId)))} style={filterBtn}>Select everyone</button>
          <button onClick={() => { setParticipantFilter(new Set()); setSeatAssignments({}); }} style={filterBtn}>Clear</button>
        </div>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={sectionHeading}>Assign seats (optional)</h2>
        <p style={hint}>Leave a seat as "Any" to not constrain it.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {Array.from({ length: playerCount }, (_, i) => i + 1).map((seat) => {
            const taken = assignedElsewhere(seat);
            return (
              <div key={seat} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 13, width: 60, flexShrink: 0 }}>Seat {seat}</span>
                <select
                  value={seatAssignments[seat] ?? ""}
                  onChange={(e) =>
                    setSeatAssignments((prev) => {
                      const next = { ...prev };
                      if (e.target.value) next[seat] = e.target.value;
                      else delete next[seat];
                      return next;
                    })
                  }
                  style={selectStyle}
                >
                  <option value="">Any</option>
                  {seatPool.filter((m) => !taken.has(m.userId)).map((m) => (
                    <option key={m.userId} value={m.userId}>{m.displayName}</option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
      </section>

      {deckFilter && (
        <div style={{ marginBottom: 16, fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ opacity: 0.7 }}>Deck filter: {deckFilter.deckName}</span>
          <button onClick={() => setDeckFilter(null)} style={filterBtn}>Clear</button>
        </div>
      )}

      <section style={{ marginBottom: 28 }}>
        <h2 style={sectionHeading}>Win rate</h2>
        {loading && <p style={hint}>Loading…</p>}
        {!loading && players.length === 0 && <p style={hint}>No games match this filter.</p>}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {players.map((p) => (
            <div key={p.userId} style={{ background: "#1a1a1a", borderRadius: 10, padding: "10px 14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <button onClick={() => openDeckPicker(p.userId)} style={{ background: "none", border: "none", color: "white", cursor: "pointer", fontSize: 14, padding: 0 }}>
                  {p.displayName} <span style={{ opacity: 0.5, fontSize: 12 }}>(deck ▾)</span>
                </button>
                <span style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
                  <span style={{ fontSize: 12, opacity: 0.5 }}>{p.gamesPlayed} games</span>
                  <span style={{ fontSize: 15, fontWeight: 700 }}>{(p.winRate * 100).toFixed(0)}%</span>
                </span>
              </div>
              {deckPickerFor === p.userId && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                  {deckOptions.length === 0 && <span style={{ fontSize: 12, opacity: 0.6 }}>No decks recorded for them here.</span>}
                  {deckOptions.map((d) => (
                    <button key={d.id} onClick={() => selectDeck(p.userId, d.id, d.name)} style={filterBtn}>{d.name}</button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={sectionHeading}>Win rate by seat</h2>
        {seatWins.every((s) => s.gamesPlayed === 0) && <p style={hint}>No games match this filter.</p>}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {seatWins.map((s) => (
            <BarRow key={s.seat} label={`Seat ${s.seat}`} percent={s.winRate * 100} sub={`${s.gamesPlayed} games`} />
          ))}
        </div>
      </section>

      <section>
        <h2 style={sectionHeading}>Turns games ended on</h2>
        {turns.length === 0 && <p style={hint}>No games with a recorded turn count match this filter.</p>}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {turns.map((t) => (
            <BarRow key={t.turn} label={`Turn ${t.turn}`} percent={t.percent} sub={`${t.count} games`} />
          ))}
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

const backLink: React.CSSProperties = { color: "#8fbf9f", fontSize: 14, textDecoration: "none" };
const sectionHeading: React.CSSProperties = { fontSize: 15, fontWeight: 600, marginBottom: 8 };
const hint: React.CSSProperties = { fontSize: 12, opacity: 0.6, marginBottom: 10 };
const selectStyle: React.CSSProperties = { padding: "6px 10px", borderRadius: 6, border: "1px solid #333", background: "#111", color: "white", fontSize: 13, flex: 1 };
const filterBtn: React.CSSProperties = { padding: "6px 12px", borderRadius: 8, border: "1px solid #444", background: "transparent", color: "#8fbf9f", fontSize: 12, cursor: "pointer" };
function pill(selected: boolean): React.CSSProperties {
  return {
    padding: "6px 12px", borderRadius: 20, fontSize: 13, cursor: "pointer",
    border: selected ? "1px solid #c9a227" : "1px solid #333",
    background: selected ? "rgba(201,162,39,0.15)" : "#1a1a1a", color: "white",
  };
}
