"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { isCommanderLikeFormat } from "@/lib/formats";

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

type Deck = {
  id: string; name: string; format: string;
  commanderName?: string | null; partnerName?: string | null;
  backgroundImageUrl?: string | null; backgroundCardName?: string | null;
};
type Option = { id: string; name: string };
type SeatStat = { seat: number; gamesPlayed: number; wins: number; winRate: number };
type TurnStat = { turn: number; count: number; percent: number };
type StatsResult = {
  gamesPlayed: number; wins: number; winRate: number;
  groupsPlayed: Option[]; decksUsed: Option[]; seatWins: SeatStat[]; turns: TurnStat[];
};

export default function ProfileClient({ displayName, email }: { displayName: string; email: string }) {
  const router = useRouter();

  const [decks, setDecks] = useState<Deck[]>([]);
  const [deckName, setDeckName] = useState("");
  const [deckFormat, setDeckFormat] = useState("COMMANDER");
  const [newCommanderName, setNewCommanderName] = useState("");
  const [newPartnerName, setNewPartnerName] = useState("");
  const [addingDeck, setAddingDeck] = useState(false);

  const [stats, setStats] = useState<StatsResult | null>(null);
  const [groupFilter, setGroupFilter] = useState("");
  const [deckFilter, setDeckFilter] = useState("");
  const [seatFilter, setSeatFilter] = useState("");

  useEffect(() => { loadDecks(); }, []);
  useEffect(() => { loadStats(); }, [groupFilter, deckFilter, seatFilter]);

  async function loadDecks() {
    const res = await fetch("/api/decks");
    if (res.ok) setDecks((await res.json()).decks);
  }

  async function loadStats() {
    const params = new URLSearchParams();
    if (groupFilter) params.set("groupId", groupFilter);
    if (deckFilter) params.set("deckId", deckFilter);
    if (seatFilter) params.set("seat", seatFilter);
    const res = await fetch(`/api/profile/stats?${params.toString()}`);
    if (res.ok) setStats(await res.json());
  }

  async function handleAddDeck(e: React.FormEvent) {
    e.preventDefault();
    setAddingDeck(true);
    const res = await fetch("/api/decks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: deckName,
        format: deckFormat,
        commanderName: newCommanderName || undefined,
        partnerName: newPartnerName || undefined,
      }),
    });
    setAddingDeck(false);
    if (res.ok) {
      const deck = await res.json();
      setDecks((prev) => [...prev, deck].sort((a, b) => a.name.localeCompare(b.name)));
      setDeckName("");
      setNewCommanderName("");
      setNewPartnerName("");
    }
  }

  async function handleDeleteDeck(id: string) {
    if (!confirm("Delete this deck? Past games keep their record, just without a deck name attached.")) return;
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
      <Sidebar />

      <div style={{ marginTop: 12, marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>{displayName}</h1>
        <p style={{ opacity: 0.6, fontSize: 14 }}>{email}</p>
      </div>

      <section style={{ marginBottom: 24 }}>
        <h2 style={sectionHeading}>Filter</h2>
        <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
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
            {Array.from({ length: 6 }, (_, i) => i + 1).map((s) => (
              <option key={s} value={s}>Seat {s}</option>
            ))}
          </select>
        </div>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={sectionHeading}>Win rate</h2>
        {stats && (
          <div style={statBox}>
            <span style={{ fontSize: 32, fontWeight: 700 }}>{(stats.winRate * 100).toFixed(0)}%</span>
            <span style={{ opacity: 0.6, fontSize: 13 }}>{stats.wins} wins / {stats.gamesPlayed} games</span>
          </div>
        )}
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={sectionHeading}>Win rate by seat</h2>
        {stats && stats.seatWins.length === 0 && <p style={{ opacity: 0.6, fontSize: 14 }}>No games match this filter.</p>}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {stats?.seatWins.map((s) => (
            <BarRow key={s.seat} label={`Seat ${s.seat}`} percent={s.winRate * 100} sub={`${s.gamesPlayed} games`} />
          ))}
        </div>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={sectionHeading}>Turns games ended on</h2>
        {stats && stats.turns.length === 0 && <p style={{ opacity: 0.6, fontSize: 14 }}>No games with a recorded turn count match this filter.</p>}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {stats?.turns.map((t) => (
            <BarRow key={t.turn} label={`Turn ${t.turn}`} percent={t.percent} sub={`${t.count} games`} />
          ))}
        </div>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={sectionHeading}>My decks</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
          {decks.map((d) => (
            <div key={d.id} style={{ ...deckRow, flexDirection: "column", alignItems: "stretch", gap: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>{d.name}</span>
                <span style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <span style={{ fontSize: 12, opacity: 0.6 }}>{d.format}</span>
                  <button onClick={() => handleDeleteDeck(d.id)} style={tinyDangerBtn}>Remove</button>
                </span>
              </div>
              <CommanderEditor
                deck={d}
                onUpdated={(id, commanderName, partnerName) =>
                  setDecks((prev) => prev.map((x) => (x.id === id ? { ...x, commanderName, partnerName } : x)))
                }
              />
              <BackgroundPicker
                deck={d}
                onUpdated={(id, backgroundImageUrl, backgroundCardName) =>
                  setDecks((prev) => prev.map((x) => (x.id === id ? { ...x, backgroundImageUrl, backgroundCardName } : x)))
                }
              />
            </div>
          ))}
          {decks.length === 0 && <p style={{ opacity: 0.6, fontSize: 14 }}>No decks yet.</p>}
        </div>
        <form onSubmit={handleAddDeck} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <input placeholder="Deck name" value={deckName} onChange={(e) => setDeckName(e.target.value)} required style={{ ...selectStyle, width: "100%", boxSizing: "border-box" }} />
          <select value={deckFormat} onChange={(e) => setDeckFormat(e.target.value)} style={{ ...selectStyle, width: "100%", boxSizing: "border-box" }}>
            {FORMAT_OPTIONS.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
          </select>
          {isCommanderLikeFormat(deckFormat) && (
            <>
              <input
                placeholder="Commander name"
                value={newCommanderName}
                onChange={(e) => setNewCommanderName(e.target.value)}
                style={{ ...selectStyle, width: "100%", boxSizing: "border-box" }}
              />
              <input
                placeholder="Partner (optional)"
                value={newPartnerName}
                onChange={(e) => setNewPartnerName(e.target.value)}
                style={{ ...selectStyle, width: "100%", boxSizing: "border-box" }}
              />
            </>
          )}
          <button type="submit" disabled={addingDeck} style={{ ...ghostBtn, width: "100%" }}>{addingDeck ? "Adding…" : "Add deck"}</button>
        </form>
      </section>

      <button onClick={handleLogout} style={dangerBtn}>Log out</button>
    </div>
  );
}

function CommanderEditor({
  deck,
  onUpdated,
}: {
  deck: Deck;
  onUpdated: (id: string, commanderName: string | null, partnerName: string | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [commanderInput, setCommanderInput] = useState(deck.commanderName ?? "");
  const [partnerInput, setPartnerInput] = useState(deck.partnerName ?? "");
  const [saving, setSaving] = useState(false);

  if (!isCommanderLikeFormat(deck.format)) return null;

  async function save() {
    setSaving(true);
    await fetch(`/api/decks/${deck.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commanderName: commanderInput, partnerName: partnerInput }),
    });
    setSaving(false);
    onUpdated(deck.id, commanderInput || null, partnerInput || null);
    setEditing(false);
  }

  async function clearPartner() {
    setPartnerInput("");
    await fetch(`/api/decks/${deck.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ partnerName: null }),
    });
    onUpdated(deck.id, deck.commanderName ?? null, null);
  }

  if (!editing) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 12, opacity: 0.7 }}>
          {deck.commanderName ? `Commander: ${deck.commanderName}${deck.partnerName ? ` / ${deck.partnerName}` : ""}` : "No commander set"}
        </span>
        <button onClick={() => setEditing(true)} style={tinyDangerBtn}>Edit</button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <input
        placeholder="Commander name"
        value={commanderInput}
        onChange={(e) => setCommanderInput(e.target.value)}
        style={{ ...selectStyle, width: "100%", boxSizing: "border-box" }}
      />
      <div style={{ display: "flex", gap: 6 }}>
        <input
          placeholder="Partner (optional)"
          value={partnerInput}
          onChange={(e) => setPartnerInput(e.target.value)}
          style={{ ...selectStyle, flex: 1, boxSizing: "border-box" }}
        />
        {deck.partnerName && <button onClick={clearPartner} style={tinyDangerBtn}>Remove partner</button>}
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <button onClick={save} disabled={saving} style={ghostBtn}>{saving ? "Saving…" : "Save"}</button>
        <button onClick={() => setEditing(false)} style={ghostBtn}>Cancel</button>
      </div>
    </div>
  );
}

function BackgroundPicker({
  deck,
  onUpdated,
}: {
  deck: { id: string; backgroundImageUrl?: string | null; backgroundCardName?: string | null };
  onUpdated: (id: string, backgroundImageUrl: string | null, backgroundCardName: string | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ name: string; imageUrl: string }[]>([]);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleQueryChange(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length < 2) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      const res = await fetch(`/api/cards/search?q=${encodeURIComponent(value)}`);
      if (res.ok) setResults((await res.json()).results);
    }, 350);
  }

  async function selectCard(name: string, imageUrl: string) {
    await fetch(`/api/decks/${deck.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ backgroundImageUrl: imageUrl, backgroundCardName: name }),
    });
    onUpdated(deck.id, imageUrl, name);
    setOpen(false);
    setQuery("");
    setResults([]);
  }

  async function clearBackground() {
    await fetch(`/api/decks/${deck.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ backgroundImageUrl: null, backgroundCardName: null }),
    });
    onUpdated(deck.id, null, null);
  }

  return (
    <div style={{ position: "relative", marginTop: 4 }}>
      {deck.backgroundImageUrl ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, opacity: 0.7 }}>Background: {deck.backgroundCardName}</span>
          <button onClick={clearBackground} style={tinyDangerBtn}>Clear</button>
        </div>
      ) : (
        <button onClick={() => setOpen((o) => !o)} style={{ ...tinyDangerBtn, color: "#8fbf9f" }}>
          Set background art…
        </button>
      )}

      {open && (
        <div style={{ marginTop: 6 }}>
          <input
            placeholder="Search MTG cards…"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            style={{ ...selectStyle, width: "100%", boxSizing: "border-box" }}
          />
          {results.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
              {results.map((r) => (
                <button
                  key={r.name}
                  onClick={() => selectCard(r.name, r.imageUrl)}
                  style={{
                    border: "none", padding: 0, cursor: "pointer", borderRadius: 8, overflow: "hidden",
                    width: 72, height: 72, backgroundImage: `url(${r.imageUrl})`, backgroundSize: "cover", backgroundPosition: "center",
                  }}
                  title={r.name}
                />
              ))}
            </div>
          )}
        </div>
      )}
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

const sectionHeading: React.CSSProperties = { fontSize: 16, fontWeight: 600, marginBottom: 10 };
const selectStyle: React.CSSProperties = { padding: "8px 10px", borderRadius: 6, border: "1px solid #333", background: "#1a1a1a", color: "white", fontSize: 13 };
const deckRow: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", borderRadius: 6, background: "#1a1a1a", fontSize: 14 };
const statBox: React.CSSProperties = { display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "20px 0", background: "#1a1a1a", borderRadius: 10 };
const ghostBtn: React.CSSProperties = { padding: "8px 14px", borderRadius: 8, border: "1px solid #444", background: "transparent", color: "white", fontSize: 13, cursor: "pointer" };
const dangerBtn: React.CSSProperties = { padding: "10px 16px", borderRadius: 8, border: "1px solid #7a3b3b", background: "transparent", color: "#e08080", fontSize: 14, cursor: "pointer" };
const tinyDangerBtn: React.CSSProperties = { background: "none", border: "none", color: "#e08080", fontSize: 12, cursor: "pointer", padding: 0 };
