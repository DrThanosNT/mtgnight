"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";

export default function Sidebar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const isDashboard = pathname === "/dashboard";
  const isProfile = pathname === "/profile";

  function go(path: string) {
    setOpen(false);
    router.push(path);
  }

  return (
    <>
      <button onClick={() => setOpen(true)} aria-label="Open menu" style={toggleBtnStyle}>
        ☰
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={backdropStyle} />
          <div style={panelStyle}>
            <button onClick={() => setOpen(false)} aria-label="Close menu" style={closeBtnStyle}>✕</button>

            <nav style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 40 }}>
              <button
                onClick={() => go("/dashboard")}
                disabled={isDashboard}
                style={{ ...navItem, ...(isDashboard ? navItemActive : {}) }}
              >
                Dashboard
              </button>
              <button
                onClick={() => go("/profile")}
                disabled={isProfile}
                style={{ ...navItem, ...(isProfile ? navItemActive : {}) }}
              >
                Profile
              </button>
              <button onClick={() => go("/search")} style={navItem}>
                Search
              </button>
            </nav>
          </div>
        </>
      )}
    </>
  );
}

const toggleBtnStyle: React.CSSProperties = {
  position: "fixed", top: 14, left: 14, zIndex: 40,
  width: 32, height: 32, borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.4)", fontSize: 14, cursor: "pointer",
  backdropFilter: "blur(3px)",
};
const backdropStyle: React.CSSProperties = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 45,
};
const panelStyle: React.CSSProperties = {
  position: "fixed", top: 0, left: 0, bottom: 0, width: 220, zIndex: 50,
  background: "#111", borderRight: "1px solid #262b35", padding: "16px 12px", boxSizing: "border-box",
};
const closeBtnStyle: React.CSSProperties = {
  position: "absolute", top: 12, right: 12, background: "none", border: "none",
  color: "white", fontSize: 18, cursor: "pointer",
};
const navItem: React.CSSProperties = {
  textAlign: "left", padding: "10px 12px", borderRadius: 8, color: "white",
  background: "transparent", border: "none", fontSize: 14, width: "100%", cursor: "pointer",
};
const navItemActive: React.CSSProperties = {
  background: "rgba(201,162,39,0.15)", color: "#c9a227", fontWeight: 600, cursor: "default",
};
