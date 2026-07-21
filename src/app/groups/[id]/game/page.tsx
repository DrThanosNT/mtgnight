"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import LifeCounterGame from "@/components/LifeCounter";

const PALETTE = [
  "#7f3b3b", "#3b5c7f", "#3b7f52", "#7f6f3b",
  "#5c3b7f", "#7f3b6c", "#3b7f7a", "#6c7f3b",
];

type Member = { userId: string; displayName: string };
type Deck = { id: string; name: string };

export default function GroupGameSetupPage() {
  const { id: groupId } = useParams<{ id: string }>();
  const router = useRouter();

  const [group, setGroup] = useState<{ format: string; playerCount: number; startingLife?: number } | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [decksByMember, setDecksByMember] = useState<Record<string, Deck[]>>({});
  const [selectedDeck, setSelectedDeck] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [groupRes, membersRes] = await Promise.all([
          fetch(`/api/groups/${groupId}`).then((r) => r.json()),
          fetch(`/api/groups/${groupId}/members`).then((r) => r.json()),
        ]);
        setGroup(groupRes);
        const activeMembers: Member[] = membersRes.members;
        setMembers(activeMembers);

        const deckLists = await Promise.all(
          activeMembers.map((m) =>
            fetch(`/api/groups/${groupId}/members/${m.userId}/decks`).then((r) => r.json())
          )
        );
        const map: Record<string, Deck[]> = {};
        const initialSelection: Record<string, string> = {};
        activeMembers.forEach((m, i) => {
          map[m.userId] = deckLists[i].decks ?? [];
          if (map[m.userId].length === 1) {
            initialSelection[m.userId] = map[m.userId][0].id;
          }
        });
        setDecksByMember(map);
        setSelectedDeck(initialSelection);
      } catch {
        setError("Couldn't load group details.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [groupId]);

  if (loading) return <p style={{ color: "white", padding: 24 }}>Loading…</p>;
  if (error || !group) return <p style={{ color: "white", padding: 24 }}>{error ?? "Group not found."}</p>;

  const everyoneHasADeck = members.every(
    (m) => decksByMember[m.userId]?.length === 0 || selectedDeck[m.userId]
  );

  if (ready) {
    return (
      <LifeCounterGame
        mode="group"
        startingLife={group.startingLife ?? 40}
        initialPlayers={members.map((m, i) => ({
          id: m.userId,
          name: m.displayName,
          deckId: selectedDeck[m.userId],
          color: PALETTE[i % PALETTE.length],
        }))}
        onGameEnd={(result) => {
          fetch(`/api/groups/${groupId}/games`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(result),
          });
        }}
        onExit={() => router.push(`/groups/${groupId}`)}
      />
    );
  }

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: 24, color: "white" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <Link href={`/groups/${groupId}`} style={backLink}>← Group</Link>
        <Link href="/dashboard" style={backLink}>Dashboard</Link>
      </div>

      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>Pick decks — {group.format}</h1>

      {members.map((m) => {
        const decks = decksByMember[m.userId] ?? [];
        return (
          <div key={m.userId} style={{ marginBottom: 20 }}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>{m.displayName}</div>
            {decks.length === 0 ? (
              <p style={{ fontSize: 13, opacity: 0.7 }}>No {group.format} decks on their profile yet.</p>
            ) : (
              <DeckPicker
                decks={decks}
                value={selectedDeck[m.userId]}
                onChange={(deckId) => setSelectedDeck((prev) => ({ ...prev, [m.userId]: deckId }))}
              />
            )}
          </div>
        );
      })}

      <button
        onClick={() => setReady(true)}
        disabled={!everyoneHasADeck}
        style={{
          width: "100%", padding: "14px 0", borderRadius: 8, border: "none",
          background: everyoneHasADeck ? "#4a7c59" : "#555",
          color: "white", fontSize: 16,
          cursor: everyoneHasADeck ? "pointer" : "not-allowed",
        }}
      >
        Set up seating
      </button>
    </div>
  );
}

function DeckPicker({
  decks,
  value,
  onChange,
}: {
  decks: Deck[];
  value: string | undefined;
  onChange: (deckId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const selected = decks.find((d) => d.id === value);
  const filtered = decks.filter((d) => d.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <div style={{ position: "relative" }}>
      <input
        placeholder="Search decks…"
        value={open ? query : selected?.name ?? ""}
        onFocus={() => { setOpen(true); setQuery(""); }}
        onChange={(e) => setQuery(e.target.value)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        style={{
          width: "100%", padding: "10px 12px", borderRadius: 6, border: "1px solid #333",
          background: "#1a1a1a", color: "white", fontSize: 14, boxSizing: "border-box",
        }}
      />
      {open && (
        <div
          style={{
            position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 10,
            background: "#1a1a1a", border: "1px solid #333", borderRadius: 6,
            maxHeight: 180, overflowY: "auto",
          }}
        >
          {filtered.length === 0 && <div style={{ padding: "10px 12px", fontSize: 13, opacity: 0.6 }}>No matches</div>}
          {filtered.map((d) => (
            <div
              key={d.id}
              onMouseDown={() => { onChange(d.id); setOpen(false); }}
              style={{ padding: "10px 12px", fontSize: 14, cursor: "pointer", background: d.id === value ? "#2a2f38" : "transparent" }}
            >
              {d.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const backLink: React.CSSProperties = { color: "#8fbf9f", fontSize: 14, textDecoration: "none" };
