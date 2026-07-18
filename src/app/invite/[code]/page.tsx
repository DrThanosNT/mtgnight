"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function InvitePage() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "joining">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleJoin() {
    setStatus("joining");
    setError(null);
    const res = await fetch(`/api/invite/${code}`, { method: "POST" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "Couldn't join this group.");
      setStatus("idle");
      return;
    }
    const data = await res.json();
    router.push(`/groups/${data.groupId}`);
  }

  return (
    <div style={{ maxWidth: 420, margin: "80px auto", padding: 24, color: "white", textAlign: "center" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>Join this group?</h1>
      <p style={{ opacity: 0.7, fontSize: 14, marginBottom: 24 }}>
        You've been invited to join an MTG playgroup.
      </p>
      {error && <p style={{ color: "#e08080", fontSize: 14, marginBottom: 16 }}>{error}</p>}
      <button
        onClick={handleJoin}
        disabled={status === "joining"}
        style={{
          padding: "12px 24px", borderRadius: 8, border: "none",
          background: "#4a7c59", color: "white", fontSize: 16, cursor: "pointer",
        }}
      >
        {status === "joining" ? "Joining…" : "Join group"}
      </button>
      <div style={{ marginTop: 20 }}>
        <Link href="/dashboard" style={{ color: "#8fbf9f", fontSize: 14 }}>Cancel</Link>
      </div>
    </div>
  );
}
