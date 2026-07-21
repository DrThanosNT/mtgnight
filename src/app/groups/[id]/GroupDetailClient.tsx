"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Member = { userId: string; displayName: string; isOwner: boolean; isMe: boolean };

export default function GroupDetailClient({
  group,
  members,
  isOwner,
}: {
  group: { id: string; name: string; format: string; playerCount: number };
  members: Member[];
  isOwner: boolean;
}) {
  const router = useRouter();

  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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
        {members.length >= 2 ? (
          <Link href={`/groups/${group.id}/game`} style={primaryBtn}>
            Start a game
          </Link>
        ) : (
          <span style={{ ...primaryBtn, opacity: 0.5, cursor: "not-allowed" }}>
            Need 2+ members to play
          </span>
        )}
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
          {members.length >= 6 ? (
            <p style={{ fontSize: 13, opacity: 0.6 }}>Group is full (max 6 members).</p>
          ) : !inviteUrl ? (
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