"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, displayName }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(
        typeof data.error === "string" ? data.error : "Couldn't create account — check your details"
      );
      return;
    }
    router.push(redirectTo);
    router.refresh();
  }

  return (
    <div style={wrap}>
      <h1 style={heading}>Create an account</h1>
      <form onSubmit={handleSubmit} style={form}>
        <label style={label}>
          Display name
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} required style={input} />
        </label>
        <label style={label}>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={input} />
        </label>
        <label style={label}>
          Password (min 8 characters)
          <input
            type="password"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={input}
          />
        </label>
        {error && <p style={errorText}>{error}</p>}
        <button type="submit" disabled={loading} style={primaryBtn}>
          {loading ? "Creating…" : "Create account"}
        </button>
      </form>
      <p style={{ marginTop: 16, opacity: 0.7 }}>
        Already have an account? <Link href={`/login?redirect=${encodeURIComponent(redirectTo)}`} style={{ color: "#8fbf9f" }}>Log in</Link>
      </p>
    </div>
  );
}

const wrap: React.CSSProperties = { maxWidth: 360, margin: "80px auto", padding: 24, color: "white" };
const heading: React.CSSProperties = { fontSize: 24, fontWeight: 700, marginBottom: 20 };
const form: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 14 };
const label: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 6, fontSize: 14 };
const input: React.CSSProperties = {
  padding: "10px 12px", borderRadius: 6, border: "1px solid #333",
  background: "#1a1a1a", color: "white", fontSize: 15,
};
const primaryBtn: React.CSSProperties = {
  marginTop: 6, padding: "12px 0", borderRadius: 8, border: "none",
  background: "#4a7c59", color: "white", fontSize: 16, cursor: "pointer",
};
const errorText: React.CSSProperties = { color: "#e08080", fontSize: 14 };