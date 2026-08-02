"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ username: string; displayName: string }[]>([]);

  async function handleSearch(value: string) {
    setQuery(value);
    if (value.trim().length < 2) {
      setResults([]);
      return;
    }
    const res = await fetch(`/api/users/search?q=${encodeURIComponent(value)}`);
    if (res.ok) setResults((await res.json()).results);
  }

  const isDashboard = pathname === "/dashboard";
  const isProfile = pathname === "/profile";

  return (
    <div style={{ width: 180, flexShrink: 0, padding: "24px 12px", borderRight: "1px solid #262b35", display: "flex", flexDirection: "column", gap: 16 }}>
      <Link
        href="/dashboard"
        style={{ ...navItem, ...(isDashboard ? navItemActive : {}), pointerEvents: isDashboard ? "none" : "auto" }}
      >
        Dashboard
      </Link>
      <Link
        href="/profile"
        style={{ ...navItem, ...(isProfile ? navItemActive : {}), pointerEvents: isProfile ? "none" : "auto" }}
      >
        Profile
      </Link>

      <div style={{ marginTop: 8 }}>
        <input
          placeholder="Find a player…"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          style={{ width: "100%", boxSizing: "border-box", padding: "8px 10px", borderRadius: 6, border: "1px solid #333", background: "#1a1a1a", color: "white", fontSize: 13 }}
        />
        {results.length > 0 && (
          <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 4 }}>
            {results.map((r) => (
              <button
                key={r.username}
                onClick={() => { router.push(`/profile/${r.username}`); setQuery(""); setResults([]); }}
                style={{ textAlign: "left", background: "#1a1a1a", border: "none", color: "white", borderRadius: 6, padding: "6px 8px", fontSize: 13, cursor: "pointer" }}
              >
                {r.displayName} <span style={{ opacity: 0.5 }}>@{r.username}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const navItem: React.CSSProperties = {
  padding: "8px 12px", borderRadius: 8, color: "white", textDecoration: "none", fontSize: 14,
};
const navItemActive: React.CSSProperties = {
  background: "rgba(201,162,39,0.15)", color: "#c9a227", fontWeight: 600,
};
