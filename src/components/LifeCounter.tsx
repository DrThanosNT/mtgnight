"use client";

import { useState, useRef, useEffect } from "react";
import { colors, primaryBtnStyle, ghostBtnStyle } from "@/lib/theme";

// ---------- Types ----------

type CounterType = "poison" | "rad" | "energy" | "experience" | "treasure" | "commanderTax" | "storm";

const COUNTER_META: Record<CounterType, { tag: string; label: string; badgeColor: string }> = {
  poison: { tag: "PSN", label: "Poison", badgeColor: "#4a7c3b" },
  rad: { tag: "RAD", label: "Rad", badgeColor: "#7ca03b" },
  energy: { tag: "NRG", label: "Energy", badgeColor: "#3b7ca0" },
  experience: { tag: "XP", label: "Experience", badgeColor: "#a0913b" },
  treasure: { tag: "TR", label: "Treasure", badgeColor: "#a07c3b" },
  commanderTax: { tag: "TAX", label: "Cmdr Tax", badgeColor: "#6c3ba0" },
  storm: { tag: "STM", label: "Storm", badgeColor: "#3b5ca0" },
};
const COUNTER_TYPES = Object.keys(COUNTER_META) as CounterType[];

type SeatPlayer = {
  id: string;
  name: string;
  deckId?: string;
  color: string;
};

type PlayerState = SeatPlayer & {
  life: number;
  counters: Record<CounterType, number>;
  commanderDamageTaken: Record<string, number>;
};

type GameEndResult = {
  turnCount: number;
  players: {
    userId: string;
    deckId?: string;
    seatOrder: number;
    finalLife: number;
    isWinner: boolean;
  }[];
};

type Phase = "setup" | "firstPlayer" | "playing" | "summary";

// ---------- Main component ----------

export default function LifeCounterGame(props: {
  mode: "group" | "casual";
  startingLife: number;
  initialPlayers: SeatPlayer[];
  onGameEnd?: (result: GameEndResult) => void;
  onExit?: () => void;
}) {
  const { mode, startingLife, initialPlayers, onGameEnd, onExit } = props;

  const [seating, setSeating] = useState<SeatPlayer[]>(initialPlayers);
  const [phase, setPhase] = useState<Phase>("setup");

  const [firstPlayerIndex, setFirstPlayerIndex] = useState<number | null>(null);
  const [rolling, setRolling] = useState(false);
  const [rollingHighlight, setRollingHighlight] = useState<number | null>(null);

  const [players, setPlayers] = useState<PlayerState[]>([]);
  const [turnOrder, setTurnOrder] = useState<string[]>([]);
  const [activeTurnIdx, setActiveTurnIdx] = useState(0);
  const [turnCount, setTurnCount] = useState(1);

  function renamePlayer(id: string, name: string) {
    setSeating((prev) => prev.map((p) => (p.id === id ? { ...p, name } : p)));
  }

  function movePlayer(index: number, dir: -1 | 1) {
    setSeating((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  const dragIndex = useRef<number | null>(null);
  function onDragStart(index: number) {
    dragIndex.current = index;
  }
  function onDrop(index: number) {
    setSeating((prev) => {
      if (dragIndex.current === null || dragIndex.current === index) return prev;
      const next = [...prev];
      const [moved] = next.splice(dragIndex.current, 1);
      next.splice(index, 0, moved);
      dragIndex.current = null;
      return next;
    });
  }

  function proceedToFirstPlayer() {
    setPhase("firstPlayer");
  }

  function pickManually(index: number) {
    setRolling(false);
    setRollingHighlight(null);
    setFirstPlayerIndex(index);
  }

  function rollDice() {
    setFirstPlayerIndex(null);
    setRolling(true);
    let ticks = 0;
    const maxTicks = 14;
    const interval = setInterval(() => {
      setRollingHighlight(Math.floor(Math.random() * seating.length));
      ticks++;
      if (ticks >= maxTicks) {
        clearInterval(interval);
        const finalIndex = Math.floor(Math.random() * seating.length);
        setRollingHighlight(null);
        setFirstPlayerIndex(finalIndex);
        setRolling(false);
      }
    }, 90);
  }

  function startGame() {
    if (firstPlayerIndex === null) return;
    const order = [...seating.slice(firstPlayerIndex), ...seating.slice(0, firstPlayerIndex)].map((p) => p.id);
    const allIds = seating.map((p) => p.id);

    setPlayers(
      seating.map((p) => ({
        ...p,
        life: startingLife,
        counters: { poison: 0, rad: 0, energy: 0, experience: 0, treasure: 0, commanderTax: 0, storm: 0 },
        commanderDamageTaken: Object.fromEntries(allIds.filter((id) => id !== p.id).map((id) => [id, 0])),
      }))
    );
    setTurnOrder(order);
    setActiveTurnIdx(0);
    setTurnCount(1);
    setPhase("playing");
  }

  function adjustLife(id: string, delta: number) {
    setPlayers((prev) => prev.map((p) => (p.id === id ? { ...p, life: p.life + delta } : p)));
  }

  function adjustCounter(id: string, type: CounterType, delta: number) {
    setPlayers((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, counters: { ...p.counters, [type]: Math.max(0, p.counters[type] + delta) } }
          : p
      )
    );
  }

  function adjustCommanderDamage(targetId: string, fromId: string, delta: number) {
    setPlayers((prev) =>
      prev.map((p) => {
        if (p.id !== targetId) return p;
        const current = p.commanderDamageTaken[fromId] ?? 0;
        const nextVal = Math.max(0, current + delta);
        return { ...p, commanderDamageTaken: { ...p.commanderDamageTaken, [fromId]: nextVal } };
      })
    );
  }

  function endTurn() {
    const next = (activeTurnIdx + 1) % turnOrder.length;
    setActiveTurnIdx(next);
    if (next === 0) {
      setTurnCount((t) => t + 1);
    }
  }

  function finishGame() {
    setPhase("summary");
  }

  function confirmWinner(winnerId: string | null) {
  if (mode === "group" && onGameEnd) {
    onGameEnd({
      turnCount,
      players: players.map((p) => ({
        userId: p.id,
        deckId: p.deckId,
        seatOrder: turnOrder.indexOf(p.id),
        finalLife: p.life,
        isWinner: p.id === winnerId,
      })),
    });
  }

  if (onExit) {
    // Navigating away - the component is about to unmount, so there's no
    // point resetting local state first (that's what caused the brief
    // flash of the "arrange seating" screen before the page actually changed).
    onExit();
    return;
  }

  // No onExit provided - nowhere to navigate to, so reset in place
  setPhase("setup");
  setFirstPlayerIndex(null);
  setRolling(false);
  setRollingHighlight(null);
  setPlayers([]);
  setActiveTurnIdx(0);
  setTurnCount(1);
}

  // ---------- Render: first player selection ----------

  if (phase === "firstPlayer") {
    const highlighted = rolling ? rollingHighlight : firstPlayerIndex;
    return (
      <div style={centeredPhaseStyle}>
        <div style={{ maxWidth: 480, margin: "0 auto", width: "100%" }}>
          <h2 style={headingStyle}>Who plays first?</h2>
          <div style={styles.seatList}>
            {seating.map((p, i) => (
              <button
                key={p.id}
                onClick={() => pickManually(i)}
                style={{
                  ...styles.pickRow,
                  background: p.color,
                  outline: highlighted === i ? `3px solid ${colors.gold}` : "none",
                }}
              >
                {p.name}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            <button style={{ ...ghostBtnStyle, flex: 1 }} onClick={rollDice} disabled={rolling}>
              🎲 Roll dice
            </button>
            <button
              style={{ ...primaryBtnStyle, flex: 1, opacity: firstPlayerIndex === null || rolling ? 0.5 : 1 }}
              onClick={startGame}
              disabled={firstPlayerIndex === null || rolling}
            >
              Start game
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---------- Render: summary ----------

  if (phase === "summary") {
    return (
      <div style={centeredPhaseStyle}>
        <div style={{ maxWidth: 480, margin: "0 auto", width: "100%" }}>
          <h2 style={headingStyle}>Who won?</h2>
          <div style={styles.seatList}>
            {players.map((p) => (
              <button key={p.id} onClick={() => confirmWinner(p.id)} style={{ ...styles.pickRow, background: p.color }}>
                {p.name} — {p.life} life
              </button>
            ))}
            <button style={{ ...ghostBtnStyle, width: "100%" }} onClick={() => confirmWinner(null)}>
              No winner / didn't finish
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---------- Render: playing ----------

  const layout = getLayout(players.length);

  return (
    <div
      style={{
        display: "flex", flexDirection: "column", height: "100dvh", width: "100vw",
        overflow: "hidden", boxSizing: "border-box", padding: 8, background: colors.bg,
      }}
    >
      <div style={styles.topBar}>
        <span style={{ fontFamily: "var(--font-display), serif" }}>Turn {turnCount}</span>
        <button style={styles.smallBtn} onClick={endTurn}>End turn ▶</button>
        <button style={styles.smallBtn} onClick={finishGame}>End game</button>
      </div>
      <div
        style={{
          display: "grid", gridTemplateColumns: layout.cols, gridTemplateRows: layout.rows,
          gap: 12, flex: 1, minHeight: 0, minWidth: 0,
        }}
      >
        {players.map((p, i) => (
          <div key={p.id} style={{ gridRow: layout.cells[i].row, gridColumn: layout.cells[i].col, minWidth: 0, minHeight: 0 }}>
            <RotatableBlock rotation={layout.cells[i].rotation}>
              <PlayerBlockContent
                player={p}
                allPlayers={players}
                isActiveTurn={turnOrder[activeTurnIdx] === p.id}
                onLifeChange={(d) => adjustLife(p.id, d)}
                onCounterChange={(t, d) => adjustCounter(p.id, t, d)}
                onCommanderDamageChange={(fromId, d) => adjustCommanderDamage(p.id, fromId, d)}
              />
            </RotatableBlock>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- Rotatable block ----------

function RotatableBlock({ rotation, children }: { rotation: 0 | 90 | 180 | 270; children: React.ReactNode }) {
  const outerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = outerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setSize({ w: width, h: height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const swapped = rotation === 90 || rotation === 270;
  const innerWidth = swapped ? size.h : size.w;
  const innerHeight = swapped ? size.w : size.h;

  return (
    <div ref={outerRef} style={{ position: "relative", overflow: "hidden", width: "100%", height: "100%", minWidth: 0, minHeight: 0 }}>
      {size.w > 0 && size.h > 0 && (
        <div
          style={{
            position: "absolute", top: "50%", left: "50%", width: innerWidth, height: innerHeight,
            transform: `translate(-50%, -50%) rotate(${rotation}deg)`, display: "flex",
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

// ---------- Tap-vs-hold life button ----------

function LifeButton({ sign, onChange }: { sign: 1 | -1; onChange: (delta: number) => void }) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdTriggeredRef = useRef(false);

  function start() {
    holdTriggeredRef.current = false;
    timeoutRef.current = setTimeout(() => {
      holdTriggeredRef.current = true;
      onChange(sign * 10);
      intervalRef.current = setInterval(() => onChange(sign * 10), 1500);
    }, 1500);
  }

  function end() {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (!holdTriggeredRef.current) {
      onChange(sign);
    }
    holdTriggeredRef.current = false;
  }

  return (
    <button
      onPointerDown={start}
      onPointerUp={end}
      onPointerLeave={end}
      onPointerCancel={end}
      style={{ ...lifeButtonStyle, touchAction: "none" }}
    >
      {sign === 1 ? "+" : "–"}
    </button>
  );
}

// ---------- Player block content ----------

function PlayerBlockContent({
  player,
  allPlayers,
  isActiveTurn,
  onLifeChange,
  onCounterChange,
  onCommanderDamageChange,
}: {
  player: PlayerState;
  allPlayers: PlayerState[];
  isActiveTurn: boolean;
  onLifeChange: (delta: number) => void;
  onCounterChange: (type: CounterType, delta: number) => void;
  onCommanderDamageChange: (fromId: string, delta: number) => void;
}) {
  const [panel, setPanel] = useState<"none" | "counters" | "commanderDamage">("none");
  const opponents = allPlayers.filter((p) => p.id !== player.id);

  return (
    <div
      style={{
        width: "100%", height: "100%", background: player.color,
        borderRadius: 22, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        padding: "4px 8px", outline: isActiveTurn ? `3px solid ${colors.gold}` : "none", color: "white",
        userSelect: "none", overflow: "hidden", boxSizing: "border-box",
        boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)",
      }}
    >
      <div style={{ fontWeight: 600, fontSize: "clamp(11px, 3vmin, 15px)", marginBottom: 2 }}>{player.name}</div>

      <div style={{ display: "flex", alignItems: "center", gap: "clamp(6px, 3vmin, 16px)" }}>
        <LifeButton sign={-1} onChange={onLifeChange} />
        <span style={{ fontSize: "clamp(20px, 8vmin, 40px)", fontWeight: 700, minWidth: "1.5em", textAlign: "center" }}>
          {player.life}
        </span>
        <LifeButton sign={1} onChange={onLifeChange} />
      </div>

      <div style={{ display: "flex", gap: 4, marginTop: 3 }}>
        <button style={styles.tinyBtn} onClick={() => setPanel(panel === "counters" ? "none" : "counters")}>
          {panel === "counters" ? "Hide" : "Counters"}
        </button>
        <button style={styles.tinyBtn} onClick={() => setPanel(panel === "commanderDamage" ? "none" : "commanderDamage")}>
          Cmdr Dmg
        </button>
      </div>

      {panel === "counters" && (
        <div style={{ ...styles.counterGrid, maxHeight: "40%", overflowY: "auto" }}>
          {COUNTER_TYPES.map((type) => (
            <div key={type} style={styles.counterRow}>
              <span style={{ ...styles.counterBadge, background: COUNTER_META[type].badgeColor }}>
                {COUNTER_META[type].tag}
              </span>
              <button style={styles.tinyBtn} onClick={() => onCounterChange(type, -1)}>-</button>
              <span style={{ minWidth: 16, textAlign: "center" }}>{player.counters[type]}</span>
              <button style={styles.tinyBtn} onClick={() => onCounterChange(type, 1)}>+</button>
            </div>
          ))}
        </div>
      )}

      {panel === "commanderDamage" && (
        <div style={{ ...styles.counterGrid, gridTemplateColumns: "1fr", maxHeight: "40%", overflowY: "auto" }}>
          {opponents.map((opp) => {
            const dmg = player.commanderDamageTaken[opp.id] ?? 0;
            const lethal = dmg >= 21;
            return (
              <div key={opp.id} style={styles.counterRow}>
                <span
                  style={{
                    ...styles.counterBadge, background: opp.color,
                    outline: lethal ? "2px solid #ff5050" : "none",
                  }}
                >
                  {opp.name.slice(0, 3)}
                </span>
                <button style={styles.tinyBtn} onClick={() => onCommanderDamageChange(opp.id, -1)}>-</button>
                <span style={{ minWidth: 16, textAlign: "center", color: lethal ? "#ff8080" : "white" }}>{dmg}</span>
                <button style={styles.tinyBtn} onClick={() => onCommanderDamageChange(opp.id, 1)}>+</button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------- Layout logic ----------

type Cell = { row: string; col: string; rotation: 0 | 90 | 180 | 270 };

function getLayout(count: number): { cols: string; rows: string; cells: Cell[] } {
  switch (count) {
    case 2:
      return { cols: "1fr", rows: "1fr 1fr", cells: [{ row: "1", col: "1", rotation: 180 }, { row: "2", col: "1", rotation: 0 }] };
    case 3:
  return {
    cols: "1fr 1fr",
    rows: "1fr 2fr", // top (full width) shorter, bottom two (half width) taller — equal area
    cells: [
      { row: "1", col: "1 / span 2", rotation: 180 },
      { row: "2", col: "1", rotation: 0 },
      { row: "2", col: "2", rotation: 0 },
    ],
  };
    case 4:
      return {
        cols: "1fr 1fr", rows: "1fr 1fr",
        cells: [
          { row: "1", col: "1", rotation: 180 }, { row: "1", col: "2", rotation: 180 },
          { row: "2", col: "1", rotation: 0 }, { row: "2", col: "2", rotation: 0 },
        ],
      };
    case 5:
  return {
    cols: "1fr 1fr 1fr 1fr",
    rows: "2fr 4fr 1fr", // balances north (half-width x2), sides (quarter-width x2), south (full-width x1)
    cells: [
      { row: "1", col: "1 / span 2", rotation: 180 },
      { row: "1", col: "3 / span 2", rotation: 180 },
      { row: "2", col: "1", rotation: 90 },
      { row: "2", col: "4", rotation: 270 },
      { row: "3", col: "1 / span 4", rotation: 0 },
    ],
  };
    case 6:
      return {
        cols: "1fr 1fr 1fr 1fr", rows: "1fr 1fr 1fr",
        cells: [
          { row: "1", col: "1 / span 2", rotation: 180 }, { row: "1", col: "3 / span 2", rotation: 180 },
          { row: "2", col: "1", rotation: 90 }, { row: "2", col: "4", rotation: 270 },
          { row: "3", col: "1 / span 2", rotation: 0 }, { row: "3", col: "3 / span 2", rotation: 0 },
        ],
      };
    default: {
      const cols = count <= 4 ? count : Math.ceil(count / 2);
      const rows = Math.ceil(count / cols);
      return {
        cols: `repeat(${cols}, 1fr)`, rows: `repeat(${rows}, 1fr)`,
        cells: Array.from({ length: count }, () => ({ row: "auto", col: "auto", rotation: 0 })),
      };
    }
  }
}

// ---------- Shared phase-wrapper styles ----------

const centeredPhaseStyle: React.CSSProperties = {
  minHeight: "100dvh",
  boxSizing: "border-box",
  padding: "28px 20px",
  display: "flex",
  flexDirection: "column",
  justifyContent: "flex-start",
  background: colors.bg,
  overflowY: "auto",
};

const headingStyle: React.CSSProperties = {
  fontSize: 24, fontWeight: 700, marginBottom: 6, color: colors.text,
};

const subtextStyle: React.CSSProperties = {
  fontSize: 14, opacity: 0.65, marginBottom: 20, color: colors.text, fontFamily: "var(--font-body)",
};

// ---------- Styles ----------

const lifeButtonStyle: React.CSSProperties = {
  width: "clamp(32px, 10vmin, 44px)", height: "clamp(32px, 10vmin, 44px)", borderRadius: "50%",
  border: "none", fontSize: "clamp(16px, 5vmin, 24px)", background: "rgba(0,0,0,0.35)",
  color: "white", cursor: "pointer", flexShrink: 0,
};

const styles: Record<string, React.CSSProperties> = {
  seatList: { display: "flex", flexDirection: "column", gap: 10 },
  seatRow: {
    display: "flex", alignItems: "center", gap: 8, padding: "12px 14px",
    borderRadius: 14, color: "white", width: "100%", boxSizing: "border-box", overflow: "hidden",
  },
  pickRow: { padding: "16px 16px", borderRadius: 14, color: "white", border: "none", fontSize: 16, cursor: "pointer", textAlign: "left" },
  dragHandle: { cursor: "grab", opacity: 0.7, flexShrink: 0 },
  nameInput: {
    flex: 1, minWidth: 0, background: "rgba(0,0,0,0.25)", border: "none", color: "white",
    padding: "6px 8px", borderRadius: 8, fontSize: 15, boxSizing: "border-box",
  },
  nameText: {
    flex: 1, minWidth: 0, fontSize: 15, overflow: "hidden",
    textOverflow: "ellipsis", whiteSpace: "nowrap",
  },
  moveButtons: { display: "flex", gap: 4, flexShrink: 0 },
  smallBtn: { background: "rgba(0,0,0,0.3)", color: "white", border: "none", borderRadius: 8, padding: "5px 10px", cursor: "pointer" },
  tinyBtn: { background: "rgba(0,0,0,0.3)", color: "white", border: "none", borderRadius: 6, padding: "2px 6px", fontSize: 12, cursor: "pointer" },
  topBar: { display: "flex", justifyContent: "space-between", alignItems: "center", color: "white", padding: "4px 8px", marginBottom: 8, flexShrink: 0 },
  counterGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, marginTop: 6, background: "rgba(0,0,0,0.25)", borderRadius: 10, padding: 6 },
  counterRow: { display: "flex", alignItems: "center", gap: 4, fontSize: 12 },
  counterBadge: { fontSize: 9, fontWeight: 700, padding: "2px 5px", borderRadius: 6, minWidth: 26, textAlign: "center" },
};