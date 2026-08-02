"use client";

import { useState } from "react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ displayName: string }[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim().length < 2) return;
    setLoading(true);
    const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    setResults(data.results ?? []);
    setLoading(false);
  }

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: 24, color: "white" }}>
      <Sidebar />
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16, marginTop: 8 }}>Find a player</h1>
      <form onSubmit={handleSearch} style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <input
          placeholder="Search by name…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ flex: 1, padding: "10px 12px", borderRadius: 6, border: "1px solid #333", background: "#1a1a1a", color: "white", fontSize: 15, boxSizing: "border-box" }}
        />
        <button
          type="submit"
          style={{ padding: "10px 18px", borderRadius: 8, border: "none", background: "#4a7c59", color: "white", fontSize: 15, cursor: "pointer" }}
        >
          Search
        </button>
      </form>

      {loading && <p style={{ opacity: 0.6 }}>Searching…</p>}
      {results !== null && !loading && results.length === 0 && <p style={{ opacity: 0.6 }}>No players found.</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {results?.map((r) => (
          <Link
            key={r.displayName}
            href={`/profile/${encodeURIComponent(r.displayName.trim())}`}
            style={{ padding: "12px 14px", borderRadius: 8, background: "#1a1a1a", color: "white", textDecoration: "none" }}
          >
            {r.displayName}
          </Link>
        ))}
      </div>
    </div>
  );
}
