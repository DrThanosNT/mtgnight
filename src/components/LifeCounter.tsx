"use client";

import { useState, useRef, useEffect } from "react";
import { colors, primaryBtnStyle, ghostBtnStyle } from "@/lib/theme";
import { isCommanderLikeFormat } from "@/lib/formats";

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
  commanderName?: string | null;
  partnerName?: string | null;
  backgroundImageUrl?: string | null;
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

function vibrate(ms: number) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(ms);
  }
}

function mainKey(id: string) {
  return `${id}::main`;
}
function partnerKey(id: string) {
  return `${id}::partner`;
}

// ---------- Main component ----------

export default function LifeCounterGame(props: {
  mode: "group" | "casual";
  format: string;
  startingLife: number;
  initialPlayers: SeatPlayer[];
  onGameEnd?: (result: GameEndResult) => void;
  onExit?: () => void;
}) {
  const { mode, format, startingLife, initialPlayers, onGameEnd, onExit } = props;
  const showCommanders = isCommanderLikeFormat(format);

  const [seating, setSeating] = useState<SeatPlayer[]>(initialPlayers);
  const [phase, setPhase] = useState<Phase>("setup");

  const [firstPlayerIndex, setFirstPlayerIndex] = useState<number | null>(null);
  const [rolling, setRolling] = useState(false);
  const [rollingHighlight, setRollingHighlight] = useState<number | null>(null);

  const [players, setPlayers] = useState<PlayerState[]>([]);
  const [turnOrder, setTurnOrder] = useState<string[]>([]);
  const [activeTurnIdx, setActiveTurnIdx] = useState(0);
  const [turnCount, setTurnCount] = useState(1);

  const [boardOrder, setBoardOrder] = useState<string[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const submittedRef = useRef(false);

  function renamePlayer(id: string, name: string) {
    setSeating((prev) => prev.map((p) => (p.id === id ? { ...p, name } : p)));
  }

  function setPlayerBackground(id: string, backgroundImageUrl: string | null) {
    setSeating((prev) => prev.map((p) => (p.id === id ? { ...p, backgroundImageUrl } : p)));
  }

  function setPlayerCommander(id: string, field: "commanderName" | "partnerName", value: string) {
    setSeating((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value || null } : p)));
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
      seating.map((p) => {
        const commanderDamageTaken: Record<string, number> = {};
        for (const otherId of allIds) {
          if (otherId === p.id) continue;
          const other = seating.find((s) => s.id === otherId)!;
          commanderDamageTaken[mainKey(otherId)] = 0;
          if (other.partnerName) commanderDamageTaken[partnerKey(otherId)] = 0;
        }
        return {
          ...p,
          life: startingLife,
          counters: { poison: 0, rad: 0, energy: 0, experience: 0, treasure: 0, commanderTax: 0, storm: 0 },
          commanderDamageTaken,
        };
      })
    );
    setTurnOrder(order);
    setBoardOrder(seating.map((p) => p.id));
    setActiveTurnIdx(0);
    setTurnCount(1);
    submittedRef.current = false;
    setSubmitting(false);
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

  function adjustCommanderDamage(targetId: string, sourceKey: string, delta: number) {
    setPlayers((prev) =>
      prev.map((p) => {
        if (p.id !== targetId) return p;
        const current = p.commanderDamageTaken[sourceKey] ?? 0;
        const nextVal = Math.max(0, current + delta);
        return { ...p, commanderDamageTaken: { ...p.commanderDamageTaken, [sourceKey]: nextVal } };
      })
    );
  }

  function swapBoardPositions(indexA: number, indexB: number) {
    setBoardOrder((prev) => {
      if (indexA === indexB || indexA < 0 || indexB < 0 || indexA >= prev.length || indexB >= prev.length) {
        return prev;
      }
      const next = [...prev];
      [next[indexA], next[indexB]] = [next[indexB], next[indexA]];
      return next;
    });
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
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);

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
      onExit();
      return;
    }

    setPhase("setup");
    setFirstPlayerIndex(null);
    setRolling(false);
    setRollingHighlight(null);
    setPlayers([]);
    setBoardOrder([]);
    setActiveTurnIdx(0);
    setTurnCount(1);
  }

  // ---------- Render: setup ----------

  if (phase === "setup") {
    return (
      <div style={centeredPhaseStyle}>
        <div style={{ maxWidth: 480, margin: "0 auto", width: "100%" }}>
          <h2 style={headingStyle}>Arrange turn order</h2>
          <p style={subtextStyle}>Drag to set turn order, top to bottom, matching the table clockwise.</p>
          <div style={styles.seatList}>
            {seating.map((p, i) => (
              <div
                key={p.id}
                draggable
                onDragStart={() => onDragStart(i)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => onDrop(i)}
                style={{ ...styles.seatRow, background: p.color, flexDirection: "column", alignItems: "stretch" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={styles.dragHandle}>⠿</span>
                  {mode === "casual" ? (
                    <input value={p.name} onChange={(e) => renamePlayer(p.id, e.target.value)} style={styles.nameInput} />
                  ) : (
                    <span style={styles.nameText}>{p.name}</span>
                  )}
                  <div style={styles.moveButtons}>
                    <button onClick={() => movePlayer(i, -1)} style={styles.smallBtn}>↑</button>
                    <button onClick={() => movePlayer(i, 1)} style={styles.smallBtn}>↓</button>
                  </div>
                </div>
                {mode === "casual" && showCommanders && (
                  <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                    <input
                      placeholder="Commander name"
                      value={p.commanderName ?? ""}
                      onChange={(e) => setPlayerCommander(p.id, "commanderName", e.target.value)}
                      style={styles.commanderInput}
                    />
                    <input
                      placeholder="Partner (optional)"
                      value={p.partnerName ?? ""}
                      onChange={(e) => setPlayerCommander(p.id, "partnerName", e.target.value)}
                      style={styles.commanderInput}
                    />
                  </div>
                )}
                {mode === "casual" && (
                  <SeatBackgroundPicker
                    backgroundImageUrl={p.backgroundImageUrl ?? null}
                    onChange={(url) => setPlayerBackground(p.id, url)}
                  />
                )}
              </div>
            ))}
          </div>
          <button style={{ ...primaryBtnStyle, width: "100%", marginTop: 20 }} onClick={proceedToFirstPlayer}>
            Continue
          </button>
        </div>
      </div>
    );
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
              <button
                key={p.id}
                onClick={() => confirmWinner(p.id)}
                disabled={submitting}
                style={{ ...styles.pickRow, background: p.color, opacity: submitting ? 0.5 : 1, cursor: submitting ? "not-allowed" : "pointer" }}
              >
                {p.name} — {p.life} life
              </button>
            ))}
            <button
              style={{ ...ghostBtnStyle, width: "100%", opacity: submitting ? 0.5 : 1, cursor: submitting ? "not-allowed" : "pointer" }}
              onClick={() => confirmWinner(null)}
              disabled={submitting}
            >
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
      <GameBoard
        layout={layout}
        boardOrder={boardOrder}
        players={players}
        turnOrder={turnOrder}
        activeTurnIdx={activeTurnIdx}
        showCommanders={showCommanders}
        onLifeChange={adjustLife}
        onCounterChange={adjustCounter}
        onCommanderDamageChange={adjustCommanderDamage}
        onSwapPositions={swapBoardPositions}
      />
    </div>
  );
}

// ---------- Game board: grid + drag-to-swap-position handling ----------

function GameBoard({
  layout,
  boardOrder,
  players,
  turnOrder,
  activeTurnIdx,
  showCommanders,
  onLifeChange,
  onCounterChange,
  onCommanderDamageChange,
  onSwapPositions,
}: {
  layout: { cols: string; rows: string; cells: Cell[] };
  boardOrder: string[];
  players: PlayerState[];
  turnOrder: string[];
  activeTurnIdx: number;
  showCommanders: boolean;
  onLifeChange: (id: string, delta: number) => void;
  onCounterChange: (id: string, type: CounterType, delta: number) => void;
  onCommanderDamageChange: (id: string, sourceKey: string, delta: number) => void;
  onSwapPositions: (indexA: number, indexB: number) => void;
}) {
  const [dragFromIndex, setDragFromIndex] = useState<number | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const dragColorRef = useRef<string>("#fff");

  function handleDragHandlePointerDown(e: React.PointerEvent, index: number, color: string) {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragColorRef.current = color;
    setDragFromIndex(index);
    setDragPos({ x: e.clientX, y: e.clientY });
  }

  function handleDragHandlePointerMove(e: React.PointerEvent) {
    if (dragFromIndex === null) return;
    setDragPos({ x: e.clientX, y: e.clientY });
  }

  function handleDragHandlePointerUp(e: React.PointerEvent) {
    if (dragFromIndex === null) return;
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const cellEl = el?.closest("[data-cell-index]") as HTMLElement | null;
    if (cellEl) {
      const targetIndex = Number(cellEl.dataset.cellIndex);
      if (!Number.isNaN(targetIndex)) {
        onSwapPositions(dragFromIndex, targetIndex);
      }
    }
    setDragFromIndex(null);
    setDragPos(null);
  }

  return (
    <>
      <div
        style={{
          display: "grid", gridTemplateColumns: layout.cols, gridTemplateRows: layout.rows,
          gap: 8, flex: 1, minHeight: 0, minWidth: 0,
        }}
      >
        {boardOrder.map((playerId, i) => {
          const player = players.find((p) => p.id === playerId);
          if (!player) return null;
          return (
            <div
              key={playerId}
              data-cell-index={i}
              style={{
                gridRow: layout.cells[i].row, gridColumn: layout.cells[i].col, minWidth: 0, minHeight: 0,
                opacity: dragFromIndex === i ? 0.4 : 1,
              }}
            >
              <RotatableBlock rotation={layout.cells[i].rotation}>
                <PlayerBlockContent
                  player={player}
                  allPlayers={players}
                  isActiveTurn={turnOrder[activeTurnIdx] === player.id}
                  showCommanders={showCommanders}
                  onLifeChange={(d) => onLifeChange(player.id, d)}
                  onCounterChange={(t, d) => onCounterChange(player.id, t, d)}
                  onCommanderDamageChange={(sourceKey, d) => onCommanderDamageChange(player.id, sourceKey, d)}
                  onDragHandleDown={(e) => handleDragHandlePointerDown(e, i, player.color)}
                  onDragHandleMove={handleDragHandlePointerMove}
                  onDragHandleUp={handleDragHandlePointerUp}
                />
              </RotatableBlock>
            </div>
          );
        })}
      </div>

      {dragPos && (
        <div
          style={{
            position: "fixed", left: dragPos.x - 24, top: dragPos.y - 24, width: 48, height: 48,
            borderRadius: "50%", background: dragColorRef.current, border: "3px solid white",
            pointerEvents: "none", zIndex: 999, opacity: 0.85,
          }}
        />
      )}
    </>
  );
}

// ---------- Casual-mode inline background picker (seating screen) ----------

function SeatBackgroundPicker({
  backgroundImageUrl,
  onChange,
}: {
  backgroundImageUrl: string | null;
  onChange: (url: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ name: string; imageUrl: string }[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleQueryChange(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length < 2) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      const res = await fetch(`/api/cards/search?q=${encodeURIComponent(value)}`);
      if (res.ok) setResults((await res.json()).results);
    }, 350);
  }

  function select(url: string) {
    onChange(url);
    setOpen(false);
    setQuery("");
    setResults([]);
  }

  return (
    <div style={{ marginTop: 6 }}>
      {backgroundImageUrl ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 28, height: 28, borderRadius: 6, backgroundImage: `url(${backgroundImageUrl})`,
              backgroundSize: "cover", backgroundPosition: "center", flexShrink: 0,
            }}
          />
          <button onClick={() => onChange(null)} style={styles.tinyBtn}>Clear background</button>
        </div>
      ) : (
        <button onClick={() => setOpen((o) => !o)} style={styles.tinyBtn}>
          Set background art…
        </button>
      )}

      {open && (
        <div style={{ marginTop: 6 }}>
          <input
            placeholder="Search MTG cards…"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            style={{
              width: "100%", boxSizing: "border-box", padding: "8px 10px", borderRadius: 6,
              border: "none", background: "rgba(0,0,0,0.3)", color: "white", fontSize: 13,
            }}
          />
          {results.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
              {results.map((r) => (
                <button
                  key={r.name}
                  onClick={() => select(r.imageUrl)}
                  style={{
                    border: "none", padding: 0, cursor: "pointer", borderRadius: 8, overflow: "hidden",
                    width: 56, height: 56, backgroundImage: `url(${r.imageUrl})`, backgroundSize: "cover", backgroundPosition: "center",
                  }}
                  title={r.name}
                />
              ))}
            </div>
          )}
        </div>
      )}
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

// ---------- Full-half tap zone: covers the entire left or right side of the
// card's middle area. Tap = ±1, hold past 2s = ±10 repeating every 2s.
// Flashes white while pressed/held. Both zones are flex siblings in one
// row, so they're always visually on the same line as each other. ----------

const HOLD_THRESHOLD_MS = 500;
const HOLD_REPEAT_MS = 500;

function LifeZone({ sign, onChange }: { sign: 1 | -1; onChange: (delta: number) => void }) {
  const [flash, setFlash] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdTriggeredRef = useRef(false);
  const activeRef = useRef(false);

  function fire(delta: number) {
    onChange(delta);
    vibrate(15);
  }

  function start(e: React.PointerEvent) {
    e.preventDefault();
    if (activeRef.current) return;
    activeRef.current = true;
    setFlash(true);
    holdTriggeredRef.current = false;
    timeoutRef.current = setTimeout(() => {
      holdTriggeredRef.current = true;
      fire(sign * 10);
      intervalRef.current = setInterval(() => fire(sign * 10), HOLD_REPEAT_MS);
    }, HOLD_THRESHOLD_MS);
  }

  function end() {
    if (!activeRef.current) return;
    activeRef.current = false;
    setFlash(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (!holdTriggeredRef.current) {
      fire(sign);
    }
  }

  return (
    <button
      onPointerDown={start}
      onPointerUp={end}
      onPointerLeave={end}
      onPointerCancel={end}
      style={{
        flex: 1, position: "relative", border: "none", background: "transparent",
        touchAction: "none", cursor: "pointer", display: "flex", alignItems: "center",
        justifyContent: sign === -1 ? "flex-start" : "flex-end", padding: "0 10px", boxSizing: "border-box",
      }}
    >
      <div
        style={{
          position: "absolute", inset: 0, background: "white",
          opacity: flash ? 0.22 : 0, transition: "opacity 120ms ease-out", pointerEvents: "none",
        }}
      />
      <span
        style={{
          fontSize: "clamp(28px, 9vmin, 44px)", fontWeight: 700, color: "white",
          filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.6))", position: "relative", zIndex: 1,
        }}
      >
        {sign === 1 ? "+" : "–"}
      </span>
    </button>
  );
}

// ---------- Player block content ----------

function PlayerBlockContent({
  player,
  allPlayers,
  isActiveTurn,
  showCommanders,
  onLifeChange,
  onCounterChange,
  onCommanderDamageChange,
  onDragHandleDown,
  onDragHandleMove,
  onDragHandleUp,
}: {
  player: PlayerState;
  allPlayers: PlayerState[];
  isActiveTurn: boolean;
  showCommanders: boolean;
  onLifeChange: (delta: number) => void;
  onCounterChange: (type: CounterType, delta: number) => void;
  onCommanderDamageChange: (sourceKey: string, delta: number) => void;
  onDragHandleDown: (e: React.PointerEvent) => void;
  onDragHandleMove: (e: React.PointerEvent) => void;
  onDragHandleUp: (e: React.PointerEvent) => void;
}) {
  const [panel, setPanel] = useState<"none" | "counters" | "commanderDamage">("none");
  const opponents = allPlayers.filter((p) => p.id !== player.id);

  const [delta, setDelta] = useState<number | null>(null);
  const deltaTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleLifeChange(amount: number) {
    onLifeChange(amount);
    setDelta((prev) => (prev === null ? amount : prev + amount));
    if (deltaTimeoutRef.current) clearTimeout(deltaTimeoutRef.current);
    deltaTimeoutRef.current = setTimeout(() => setDelta(null), 4000);
  }

  function handleCommanderDamageChange(sourceKey: string, cdDelta: number) {
    onCommanderDamageChange(sourceKey, cdDelta);
    handleLifeChange(-cdDelta);
  }

  useEffect(() => {
    return () => {
      if (deltaTimeoutRef.current) clearTimeout(deltaTimeoutRef.current);
    };
  }, []);

  const panelOpen = panel !== "none";

  // Falls back to the opponent's own player name if no commander name was
  // ever set on their deck (e.g. a casual game, or a deck saved before a
  // commander was filled in) - so there's always a legible label rather
  // than a blank entry.
  const commanderRows: { key: string; label: string; color: string }[] = [];
  for (const opp of opponents) {
    commanderRows.push({ key: mainKey(opp.id), label: opp.commanderName || opp.name, color: opp.color });
    if (opp.partnerName) {
      commanderRows.push({ key: partnerKey(opp.id), label: opp.partnerName, color: opp.color });
    }
  }

  return (
    <div
      style={{
        position: "relative", width: "100%", height: "100%",
        background: player.backgroundImageUrl
          ? `linear-gradient(rgba(0,0,0,0.25), rgba(0,0,0,0.25)), url(${player.backgroundImageUrl})`
          : player.color,
        backgroundSize: "cover",
        backgroundPosition: "center",
        borderRadius: 22, outline: isActiveTurn ? `3px solid ${colors.gold}` : "none", color: "white",
        userSelect: "none", overflow: "hidden", boxSizing: "border-box",
        boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)",
      }}
    >
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "6px 8px 0", flexShrink: 0, zIndex: 2 }}>
          <button
            onPointerDown={onDragHandleDown}
            onPointerMove={onDragHandleMove}
            onPointerUp={onDragHandleUp}
            onPointerCancel={onDragHandleUp}
            title="Drag to move this player"
            style={{
              background: "rgba(0,0,0,0.35)", border: "none", color: "white", borderRadius: 8,
              width: 28, height: 28, fontSize: 15, cursor: "grab", touchAction: "none", flexShrink: 0,
            }}
          >
            ⠿
          </button>
          <span
            style={{
              display: "inline-block",
              background: "rgba(0,0,0,0.45)",
              padding: "4px 12px",
              borderRadius: 10,
              fontWeight: 700,
              fontSize: "clamp(16px, 4.8vmin, 23px)",
              whiteSpace: "nowrap",
              pointerEvents: "none",
            }}
          >
            {player.name}
          </span>
        </div>

        <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 6, flexShrink: 0, zIndex: 2 }}>
          <button style={styles.tinyBtn} onClick={() => setPanel(panel === "counters" ? "none" : "counters")}>
            {panel === "counters" ? "Hide" : "Counters"}
          </button>
          {showCommanders && (
            <button style={styles.tinyBtn} onClick={() => setPanel(panel === "commanderDamage" ? "none" : "commanderDamage")}>
              {panel === "commanderDamage" ? "Hide" : "Cmdr Dmg"}
            </button>
          )}
        </div>

        <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
          {!panelOpen && (
            <div style={{ position: "absolute", inset: 0, display: "flex" }}>
              <LifeZone sign={-1} onChange={handleLifeChange} />
              <LifeZone sign={1} onChange={handleLifeChange} />
            </div>
          )}

          {!panelOpen && (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
              <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span
                  style={{
                    fontSize: "clamp(34px, 14.5vmin, 72px)",
                    fontWeight: 700,
                    textShadow: "0 2px 6px rgba(0,0,0,0.55), 0 0 2px rgba(0,0,0,0.4)",
                  }}
                >
                  {player.life}
                </span>
                {delta !== null && (
                  <span
                    style={{
                      position: "absolute", top: "-1.4em", right: "-1.6em",
                      fontSize: "clamp(12px, 3.4vmin, 17px)", fontWeight: 700,
                      color: delta >= 0 ? "#8fd18f" : "#e08080",
                      background: "rgba(0,0,0,0.45)", padding: "2px 7px", borderRadius: 8,
                    }}
                  >
                    {delta > 0 ? `+${delta}` : delta}
                  </span>
                )}
              </div>
            </div>
          )}

          {panel === "counters" && (
            <div style={{ position: "absolute", inset: "0 8px 8px 8px", overflowY: "auto" }}>
              <div style={styles.counterGrid}>
                {COUNTER_TYPES.map((type) => (
                  <div key={type} style={styles.counterRow}>
                    <span style={{ ...styles.counterBadge, background: COUNTER_META[type].badgeColor }}>
                      {COUNTER_META[type].tag}
                    </span>
                    <button style={styles.counterBtn} onClick={() => onCounterChange(type, -1)}>-</button>
                    <span style={styles.counterValue}>{player.counters[type]}</span>
                    <button style={styles.counterBtn} onClick={() => onCounterChange(type, 1)}>+</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {panel === "commanderDamage" && (
            <div style={{ position: "absolute", inset: "0 8px 8px 8px", overflowY: "auto" }}>
              <div style={{ ...styles.counterGrid, gridTemplateColumns: "1fr" }}>
                {commanderRows.length === 0 && (
                  <p style={{ fontSize: 12, opacity: 0.6, padding: 4 }}>No opponents in this game.</p>
                )}
                {commanderRows.map((row) => {
                  const dmg = player.commanderDamageTaken[row.key] ?? 0;
                  const lethal = dmg >= 21;
                  return (
                    <div key={row.key} style={styles.counterRow}>
                      <span
                        style={{
                          ...styles.counterBadge, background: row.color,
                          outline: lethal ? "2px solid #ff5050" : "none",
                        }}
                        title={row.label}
                      >
                        {row.label.slice(0, 8)}
                      </span>
                      <button style={styles.counterBtn} onClick={() => handleCommanderDamageChange(row.key, -1)}>-</button>
                      <span style={{ ...styles.counterValue, color: lethal ? "#ff8080" : "white" }}>{dmg}</span>
                      <button style={styles.counterBtn} onClick={() => handleCommanderDamageChange(row.key, 1)}>+</button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
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
        rows: "1fr 2fr",
        cells: [
          { row: "1", col: "1 / span 2", rotation: 180 },
          { row: "2", col: "1", rotation: 90 },
          { row: "2", col: "2", rotation: 270 },
        ],
      };
    case 4:
      return {
        cols: "1fr 1fr", rows: "1fr 1fr",
        cells: [
          { row: "1", col: "1", rotation: 90 }, { row: "1", col: "2", rotation: 270 },
          { row: "2", col: "1", rotation: 90 }, { row: "2", col: "2", rotation: 270 },
        ],
      };
    case 5:
      return {
        cols: "1fr 1fr",
        rows: "2fr 2fr 1fr",
        cells: [
          { row: "1", col: "1", rotation: 90 },
          { row: "1", col: "2", rotation: 270 },
          { row: "2", col: "1", rotation: 90 },
          { row: "2", col: "2", rotation: 270 },
          { row: "3", col: "1 / span 2", rotation: 0 },
        ],
      };
    case 6:
      return {
        cols: "1fr 1fr", rows: "1fr 1fr 1fr",
        cells: [
          { row: "1", col: "1", rotation: 90 }, { row: "1", col: "2", rotation: 270 },
          { row: "2", col: "1", rotation: 90 }, { row: "2", col: "2", rotation: 270 },
          { row: "3", col: "1", rotation: 90 }, { row: "3", col: "2", rotation: 270 },
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
  fontSize: 26, fontWeight: 700, marginBottom: 6, color: colors.text,
};

const subtextStyle: React.CSSProperties = {
  fontSize: 15, opacity: 0.65, marginBottom: 20, color: colors.text, fontFamily: "var(--font-body)",
};

// ---------- Styles ----------

const styles: Record<string, React.CSSProperties> = {
  seatList: { display: "flex", flexDirection: "column", gap: 10 },
  seatRow: {
    display: "flex", alignItems: "center", gap: 8, padding: "12px 14px",
    borderRadius: 14, color: "white", width: "100%", boxSizing: "border-box", overflow: "hidden",
  },
  pickRow: { padding: "16px 16px", borderRadius: 14, color: "white", border: "none", fontSize: 17, cursor: "pointer", textAlign: "left" },
  dragHandle: { cursor: "grab", opacity: 0.7, flexShrink: 0 },
  nameInput: {
    flex: 1, minWidth: 0, background: "rgba(0,0,0,0.25)", border: "none", color: "white",
    padding: "6px 8px", borderRadius: 8, fontSize: 16, boxSizing: "border-box",
  },
  commanderInput: {
    flex: 1, minWidth: 0, background: "rgba(0,0,0,0.25)", border: "none", color: "white",
    padding: "6px 8px", borderRadius: 8, fontSize: 13, boxSizing: "border-box",
  },
  nameText: {
    flex: 1, minWidth: 0, fontSize: 16, overflow: "hidden",
    textOverflow: "ellipsis", whiteSpace: "nowrap",
  },
  moveButtons: { display: "flex", gap: 4, flexShrink: 0 },
  smallBtn: { background: "rgba(0,0,0,0.3)", color: "white", border: "none", borderRadius: 8, padding: "5px 10px", cursor: "pointer" },
  tinyBtn: { background: "rgba(0,0,0,0.4)", color: "white", border: "none", borderRadius: 8, padding: "6px 12px", fontSize: "clamp(13px, 3.4vmin, 16px)", fontWeight: 600, cursor: "pointer" },
  topBar: { display: "flex", justifyContent: "space-between", alignItems: "center", color: "white", padding: "4px 8px", marginBottom: 8, flexShrink: 0 },
  counterGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, background: "rgba(0,0,0,0.25)", borderRadius: 10, padding: 10 },
  counterRow: { display: "flex", alignItems: "center", gap: 6, fontSize: "clamp(13px, 3.4vmin, 16px)" },
  counterBadge: { fontSize: "clamp(10px, 2.8vmin, 13px)", fontWeight: 700, padding: "4px 8px", borderRadius: 8, minWidth: 40, textAlign: "center" },
  counterBtn: { background: "rgba(0,0,0,0.4)", color: "white", border: "none", borderRadius: 8, width: "clamp(28px, 7.5vmin, 36px)", height: "clamp(28px, 7.5vmin, 36px)", fontSize: "clamp(15px, 4vmin, 19px)", fontWeight: 700, cursor: "pointer", flexShrink: 0 },
  counterValue: { minWidth: 24, textAlign: "center", fontSize: "clamp(14px, 3.6vmin, 17px)", fontWeight: 700 },
};
