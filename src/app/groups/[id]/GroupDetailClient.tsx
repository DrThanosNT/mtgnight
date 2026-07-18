"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Member = { userId: string; displayName: string; isOwner: boolean; isMe: boolean };
type Deck = { id: string; name: string; commanders: string[]; cardCount: number | null };

export default function GroupDetailClient({
  group,
  members,
  myDecks,
  isOwner,
}: {
  group: { id: string; name: string; format: string; playerCount: number };
  members: Member[];
  myDecks: Deck[];
  isOwner: boolean;
}) {
  const router = useRouter();

  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [moxfieldUrl, setMoxfieldUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [decks, setDecks] = useState(myDecks);

  const [leaving, setLeaving] = useState(false);

  async function handleGenerateInvite() {
    setInviteError(null);
    const res = await fetch(`/api/groups/${group.id}/invite`, { method: "POST" });
    if (!res.ok) {
      setInviteError("Couldn't create an invite link.");
      return;
    }
    const data = await res.json();
    setInviteUrl(`${window.location.origin}${data.joinUrl}`);
  }

  // navigator.clipboard only exists in secure contexts (HTTPS, or
  // localhost) - on a plain HTTP LAN address it's undefined entirely.
  // Fall back to the classic hidden-textarea + execCommand trick, which
  // still works over plain HTTP.
  function copyInvite() {
    if (!inviteUrl) return;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(inviteUrl).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      });
      return;
    }

    const textarea = document.createElement("textarea");
    textarea.value = inviteUrl;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    try {
      document.execCommand("copy");
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Copy silently failed - the input field is still selectable manually
    }
    document.body.removeChild(textarea);
  }

  async function handleImportDeck(e: React.FormEvent) {
    e.preventDefault();
    setImportError(null);
    setImporting(true);
    const res = await fetch("/api/decks/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: moxfieldUrl }),
    });
    setImporting(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setImportError(typeof data.error === "string" ? data.error : "Import failed");
      return;
    }
    const deck = await res.json();
    if (deck.format !== group.format) {
      setImportError(
        `Imported "${deck.name}", but it's a ${deck.format ?? "unrecognized-format"} deck, not ${group.format}. It won't show up for this group.`
      );
    } else {
      setDecks((prev) => [...prev, deck]);
    }
    setMoxfieldUrl("");
  }

  async function handleLeave() {
    if (!confirm(`Leave ${group.name}? Your stats stay, but you'll lose access to the group.`)) return;
    setLeaving(true);
    await fetch(`/api/groups/${group.id}/leave`, { method: "POST" });
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: 24, color: "white" }}>
      <Link href="/dashboard" style={backLink}>← Dashboard</Link>

      <div style={{ marginBottom: 24, marginTop: 12 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>{group.name}</h1>
        <p style={{ opacity: 0.6, fontSize: 14 }}>
          {group.format} · {group.playerCount}-player games
        </p>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 32, flexWrap: "wrap" }}>
        <Link href={`/groups/${group.id}/game`} style={primaryBtn}>
          Start a game
        </Link>
        <Link href={`/groups/${group.id}/stats`} style={ghostBtn}>
          View stats
        </Link>
      </div>

      <section style={{ marginBottom: 32 }}>
        <h2 style={sectionHeading}>Members ({members.length})</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {members.map((m) => (
            <div key={m.userId} style={memberRow}>
              <span>
                {m.displayName} {m.isMe && <span style={{ opacity: 0.5 }}>(you)</span>}
              </span>
              {m.isOwner && <span style={{ fontSize: 12, opacity: 0.6 }}>Owner</span>}
            </div>
          ))}
        </div>

        <div style={{ marginTop: 16 }}>
          {!inviteUrl ? (
            <button onClick={handleGenerateInvite} style={ghostBtn}>
              Generate invite link
            </button>
          ) : (
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input readOnly value={inviteUrl} style={{ ...input, flex: 1 }} onFocus={(e) => e.target.select()} />
              <button onClick={copyInvite} style={ghostBtn}>
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          )}
          {inviteError && <p style={{ color: "#e08080", fontSize: 13, marginTop: 6 }}>{inviteError}</p>}
        </div>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={sectionHeading}>Your {group.format} decks</h2>
        {decks.length === 0 && (
          <p style={{ opacity: 0.6, fontSize: 14, marginBottom: 12 }}>
            No {group.format} decks imported yet.
          </p>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
          {decks.map((d) => (
            <div key={d.id} style={memberRow}>
              <span>{d.name}</span>
              <span style={{ fontSize: 12, opacity: 0.6 }}>
                {d.commanders.length > 0 ? d.commanders.join(" / ") : `${d.cardCount ?? "?"} cards`}
              </span>
            </div>
          ))}
        </div>
        <form onSubmit={handleImportDeck} style={{ display: "flex", gap: 8 }}>
          <input
            placeholder="https://moxfield.com/decks/..."
            value={moxfieldUrl}
            onChange={(e) => setMoxfieldUrl(e.target.value)}
            required
            style={{ ...input, flex: 1 }}
          />
          <button type="submit" disabled={importing} style={ghostBtn}>
            {importing ? "Importing…" : "Import"}
          </button>
        </form>
        {importError && <p style={{ color: "#e08080", fontSize: 13, marginTop: 6 }}>{importError}</p>}
      </section>

      <button onClick={handleLeave} disabled={leaving} style={dangerBtn}>
        {leaving ? "Leaving…" : "Leave group"}
      </button>
    </div>
  );
}

const backLink: React.CSSProperties = {
  color: "#8fbf9f", fontSize: 14, textDecoration: "none", display: "inline-block",
};
const sectionHeading: React.CSSProperties = { fontSize: 16, fontWeight: 600, marginBottom: 10 };
const memberRow: React.CSSProperties = {
  display: "flex", justifyContent: "space-between", padding: "8px 12px",
  borderRadius: 6, background: "#1a1a1a", fontSize: 14,
};
const input: React.CSSProperties = {
  padding: "10px 12px", borderRadius: 6, border: "1px solid #333",
  background: "#1a1a1a", color: "white", fontSize: 14,
};
const primaryBtn: React.CSSProperties = {
  padding: "10px 16px", borderRadius: 8, border: "none",
  background: "#4a7c59", color: "white", fontSize: 15, textDecoration: "none",
};
const ghostBtn: React.CSSProperties = {
  padding: "10px 16px", borderRadius: 8, border: "1px solid #444",
  background: "transparent", color: "white", fontSize: 14, cursor: "pointer", textDecoration: "none",
};
const dangerBtn: React.CSSProperties = {
  padding: "8px 14px", borderRadius: 8, border: "1px solid #7a3b3b",
  background: "transparent", color: "#e08080", fontSize: 13, cursor: "pointer",
};