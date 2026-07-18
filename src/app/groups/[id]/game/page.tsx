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
type Deck = { id: string; name: string; commanders: string[] };

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

  const everyoneHasADeck = members.every((m) => selectedDeck[m.userId]);

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
          <div key={m.userId} style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>{m.displayName}</div>
            {decks.length === 0 && (
              <p style={{ fontSize: 13, opacity: 0.7 }}>
                No {group.format} decks imported yet.
              </p>
            )}
            {decks.length > 0 && (
              <select
                value={selectedDeck[m.userId] ?? ""}
                onChange={(e) =>
                  setSelectedDeck((prev) => ({ ...prev, [m.userId]: e.target.value }))
                }
                style={{
                  width: "100%", padding: "8px 10px", borderRadius: 6,
                  border: "none", background: "#222", color: "white",
                }}
              >
                <option value="" disabled>Choose a deck…</option>
                {decks.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}{d.commanders?.length ? ` — ${d.commanders.join(" / ")}` : ""}
                  </option>
                ))}
              </select>
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

const backLink: React.CSSProperties = {
  color: "#8fbf9f", fontSize: 14, textDecoration: "none",
};
