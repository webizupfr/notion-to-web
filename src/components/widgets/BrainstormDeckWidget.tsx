"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { BrainstormCard, CardType } from "@/types/brainstorm";
import type { BrainstormDeckWidgetConfig } from "@/lib/widget-parser";
import { AnimatePresence, motion } from "framer-motion";

type SavedState = {
  lastId?: string;
  types?: CardType[];
  seconds?: number;
};

type TypeMeta = { label: string; icon: string; accent: string };

const ACTIVE_TYPES: CardType[] = ["image", "prompt"];

const TYPE_META: Record<CardType, TypeMeta> = {
  image: { label: "Image", icon: "🖼️", accent: "bg-amber-100 text-amber-700" },
  prompt: { label: "Et si…", icon: "💬", accent: "bg-indigo-100 text-indigo-700" },
  constraint: { label: "Contrainte", icon: "🧩", accent: "bg-emerald-100 text-emerald-700" },
};

function rand<T>(arr: T[]): T | undefined { return arr[Math.floor(Math.random() * arr.length)]; }
function randExcept<T extends { id: string }>(arr: T[], currentId?: string): T | undefined {
  if (arr.length === 0) return undefined;
  if (arr.length === 1) return arr[0];
  let pick: T | undefined;
  for (let i = 0; i < 6; i++) {
    pick = rand(arr);
    if (!pick || pick.id !== currentId) break;
  }
  return pick ?? arr[0];
}

function datasetPath(key: string): string {
  const k = key.trim();
  if (k.startsWith("http://") || k.startsWith("https://") || k.startsWith("/")) return k;
  return `/data/${k}.json`;
}

function normalizeImageUrl(url?: string): string | undefined {
  if (!url) return url;
  try {
    const u = new URL(url, typeof window !== "undefined" ? window.location.origin : "http://localhost");
    if (u.hostname.includes("unsplash.com") && u.pathname.includes("/photos/")) {
      const parts = u.pathname.split("/").filter(Boolean);
      const idx = parts.indexOf("photos");
      let token = idx >= 0 && idx + 1 < parts.length ? parts[idx + 1] : "";
      token = token.split("?")[0];
      const idMatch = token.match(/([A-Za-z0-9_-]{10,})$/);
      if (idMatch && idMatch[1]) return `https://source.unsplash.com/${idMatch[1]}/1600x1200`;
      if (token) return `https://source.unsplash.com/${token}/1600x1200`;
    }
    return url;
  } catch {
    return url;
  }
}

const preloadImage = (url?: string) => {
  if (!url) return;
  try {
    const img = new Image();
    img.src = url;
  } catch { /* ignore */ }
};

type TypeChipProps = {
  type: CardType;
  active: boolean;
  onToggle: (type: CardType) => void;
  onShuffle: (type: CardType) => void;
};

function TypeChip({ type, active, onToggle, onShuffle }: TypeChipProps) {
  const meta = TYPE_META[type];
  if (!meta) return null;
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => onToggle(type)}
        className={`inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-sm leading-none shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 ${active ? "bg-white" : "bg-white/60 text-slate-500"}`}
        aria-pressed={active}
        aria-label={`${active ? "Désactiver" : "Activer"} ${meta.label}`}
      >
        <span className="text-base" aria-hidden>{meta.icon}</span>
        <span className="font-medium text-slate-700">{meta.label}</span>
        <span className={`ml-1 text-xs ${active ? "text-amber-600" : "text-slate-400"}`}>{active ? "●" : "○"}</span>
      </button>
      <button
        type="button"
        onClick={() => onShuffle(type)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white/80 text-sm shadow-sm transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2"
        title={`Tirer une ${meta.label}`}
        aria-label={`Tirer une ${meta.label}`}
      >
        🔁
      </button>
    </div>
  );
}

type TimerRingProps = {
  seconds: number;
  total: number;
  running: boolean;
  onToggle: () => void;
  onReset: () => void;
};

function TimerRing({ seconds, total, running, onToggle, onReset }: TimerRingProps) {
  const pct = Math.max(0, Math.min(100, Math.round((1 - Math.max(0, seconds) / total) * 100)));
  const mm = String(Math.max(0, Math.floor(seconds / 60))).padStart(2, "0");
  const ss = String(Math.max(0, seconds % 60)).padStart(2, "0");
  return (
    <div className="flex items-center gap-2">
      <div className="relative h-11 w-11">
        <div
          className="absolute inset-0 rounded-full"
          style={{ background: `conic-gradient(#f59e0b ${pct}%, #e2e8f0 0)` }}
          aria-hidden
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute inset-1 flex items-center justify-center rounded-full bg-white text-[15px] shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2"
          aria-label={running ? "Mettre le timer en pause" : "Démarrer le timer"}
        >
          {running ? "⏸" : "▶︎"}
        </button>
      </div>
      <span className="w-[52px] text-right tabular-nums text-sm font-medium text-slate-700">{mm}:{ss}</span>
      <button
        type="button"
        onClick={onReset}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-sm shadow-sm hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2"
        title="Réinitialiser le timer"
        aria-label="Réinitialiser le timer"
      >
        ↺
      </button>
    </div>
  );
}

function KeyboardHint() {
  return (
    <div className="text-[12px] text-slate-500/70 transition hover:text-slate-600">
      Astuce :
      <span className="mx-1 inline-flex items-center justify-center rounded border border-slate-300 bg-white px-1.5 py-0.5 text-[11px] font-semibold">SPACE</span>
      pour mélanger —
      <span className="mx-1 inline-flex items-center justify-center rounded border border-slate-300 bg-white px-1 py-0.5 text-[11px] font-semibold">I</span>
      /<span className="mx-1 inline-flex items-center justify-center rounded border border-slate-300 bg-white px-1 py-0.5 text-[11px] font-semibold">E</span>
      pour tirer Image / Et si…
    </div>
  );
}

function CardBadge({ type }: { type: CardType }) {
  const meta = TYPE_META[type];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${meta.accent} shadow-sm`}> 
      <span aria-hidden>{meta.icon}</span>
      {meta.label}
    </span>
  );
}

export function BrainstormDeckWidget({ config, storageKey }: { config: BrainstormDeckWidgetConfig; storageKey: string }) {
  const { title = "🃏 Brainstorm guidé" } = config;
  const defaultSeconds = Math.max(30, (config.timerMinutes ?? 15) * 60);

  const initialCards = useMemo(() => {
    return (config.cards ?? [])
      .filter((card) => card.type === "image" || card.type === "prompt")
      .map((card) => ({ ...card, imageUrl: normalizeImageUrl(card.imageUrl) }));
  }, [config.cards]);

  const [deck, setDeck] = useState<BrainstormCard[]>(initialCards);
  const [activeTypes, setActiveTypes] = useState<Set<CardType>>(new Set(ACTIVE_TYPES));
  const [current, setCurrent] = useState<BrainstormCard | undefined>(undefined);
  const [seconds, setSeconds] = useState<number>(defaultSeconds);
  const [running, setRunning] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!config.dataset && initialCards.length) {
      setDeck(initialCards);
    }
  }, [initialCards, config.dataset]);

  useEffect(() => {
    if (!config.dataset) return;
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    const url = datasetPath(config.dataset);
    fetch(url)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((arr: unknown) => {
        if (cancelled) return;
        const asCards: BrainstormCard[] = Array.isArray(arr)
          ? arr
              .map((entry) => {
                const obj = entry as Record<string, unknown>;
                const id = typeof obj.id === "string" ? obj.id : "";
                const type = typeof obj.type === "string" ? (obj.type as CardType) : "";
                const text = typeof obj.text === "string" ? obj.text : undefined;
                const imageUrl = normalizeImageUrl(typeof obj.imageUrl === "string" ? obj.imageUrl : undefined);
                const credit = typeof obj.credit === "string" ? obj.credit : undefined;
                const tags = Array.isArray((obj as { tags?: unknown }).tags)
                  ? ((obj as { tags: unknown[] }).tags).map((v) => (typeof v === "string" ? v : "")).filter(Boolean)
                  : undefined;
                if (!id || !["image", "prompt"].includes(type)) return null;
                return { id, type: type as CardType, text, imageUrl, credit, tags } satisfies BrainstormCard;
              })
              .filter(Boolean) as BrainstormCard[]
          : [];
        if (asCards.length) {
          setDeck(asCards);
        } else {
          setLoadError("Dataset vide ou illisible");
          setDeck([]);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setLoadError("Impossible de charger les cartes");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [config.dataset, reloadKey]);

  useEffect(() => {
    setSeconds(defaultSeconds);
  }, [defaultSeconds]);

  const available = useMemo(() => deck.filter((card) => activeTypes.has(card.type)), [deck, activeTypes]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(`brainstorm_deck::${storageKey}`);
      const saved: SavedState | null = raw ? JSON.parse(raw) : null;
      if (saved) {
        if (Array.isArray(saved.types) && saved.types.length) setActiveTypes(new Set(saved.types));
        if (typeof saved.seconds === "number") setSeconds(saved.seconds);
        if (saved.lastId) {
          const found = deck.find((c) => c.id === saved.lastId);
          if (found) setCurrent(found);
        }
      }
    } catch { /* ignore */ }
  }, [storageKey, deck]);

  useEffect(() => () => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
  }, []);

  useEffect(() => {
    if (current && !activeTypes.has(current.type)) {
      setCurrent(undefined);
    }
  }, [activeTypes, current]);

  useEffect(() => {
    if (!current && available.length) {
      setCurrent(rand(available));
    }
  }, [available, current]);

  useEffect(() => {
    if (!running) return;
    if (seconds <= 0) { setRunning(false); return; }
    const id = window.setInterval(() => setSeconds((s) => s - 1), 1000);
    return () => window.clearInterval(id);
  }, [running, seconds]);

  useEffect(() => {
    try {
      const payload: SavedState = { lastId: current?.id, types: Array.from(activeTypes), seconds };
      localStorage.setItem(`brainstorm_deck::${storageKey}`, JSON.stringify(payload));
    } catch { /* ignore */ }
  }, [current, activeTypes, seconds, storageKey]);

  const queueNextPreview = useCallback((type: CardType, excludeId?: string) => {
    if (type !== "image") return;
    const pool = deck.filter((card) => card.type === "image" && card.id !== excludeId);
    const candidate = rand(pool);
    if (candidate?.imageUrl) preloadImage(candidate.imageUrl);
  }, [deck]);

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2200);
  }, []);

  const drawType = useCallback((type: CardType) => {
    const pool = deck.filter((card) => card.type === type);
    if (!pool.length) return;
    const next = randExcept(pool, current?.id);
    if (!next) return;
    setCurrent(next);
    queueNextPreview(next.type, next.id);
    if (!activeTypes.has(type)) {
      setActiveTypes((prev) => new Set([...prev, type]));
    }
  }, [deck, current?.id, queueNextPreview, activeTypes]);

  const drawRandom = useCallback(() => {
    if (!available.length) return;
    const next = randExcept(available, current?.id);
    if (!next) return;
    setCurrent(next);
    queueNextPreview(next.type, next.id);
  }, [available, current?.id, queueNextPreview]);

  const shuffleAll = useCallback(() => {
    drawRandom();
    showToast("Nouvelle combinaison ✨");
  }, [drawRandom, showToast]);

  const toggleType = useCallback((type: CardType) => {
    setActiveTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        if (next.size === 1) return prev;
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }, []);

  const resetTimer = useCallback(() => {
    setRunning(false);
    setSeconds(defaultSeconds);
  }, [defaultSeconds]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === " ") {
        event.preventDefault();
        shuffleAll();
      }
      const lower = event.key.toLowerCase();
      if (lower === "i") drawType("image");
      if (lower === "e") drawType("prompt");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawType, shuffleAll]);

  const currentMeta = current ? TYPE_META[current.type] : null;

  return (
    <section className="relative overflow-hidden rounded-3xl border border-slate-200/60 bg-[#FAF7F2] shadow-[0_24px_60px_-28px_rgba(17,24,39,0.35)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-br from-amber-200/30 via-transparent to-transparent" aria-hidden />
      <div className="relative space-y-6 p-5 md:p-7">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <h3 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-amber-400/70 text-lg text-white shadow-sm" aria-hidden>🧠</span>
            {title}
          </h3>
          <div className="flex flex-wrap items-center gap-3">
            <TypeChip type="image" active={activeTypes.has("image")} onToggle={toggleType} onShuffle={drawType} />
            <TypeChip type="prompt" active={activeTypes.has("prompt")} onToggle={toggleType} onShuffle={drawType} />
            <TimerRing seconds={seconds} total={defaultSeconds} running={running} onToggle={() => setRunning((v) => !v)} onReset={resetTimer} />
            <button
              type="button"
              onClick={shuffleAll}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 px-5 py-2 text-sm font-semibold text-slate-900 shadow-[0_12px_30px_rgba(245,158,11,0.28)] transition hover:shadow-[0_16px_34px_rgba(245,158,11,0.36)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
            >
              🌀 Mélanger
            </button>
          </div>
        </header>

        {toast ? (
          <div className="flex justify-end">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-sm font-medium text-slate-700 shadow animate-slide-in">
              ✨ {toast}
            </span>
          </div>
        ) : null}

        <div className="rounded-2xl border border-slate-200/60 bg-white/70 px-4 py-6 md:px-6 md:py-8 shadow-[0_18px_42px_rgba(15,23,42,0.08)]">
          {loading ? (
            <div className="flex h-64 items-center justify-center text-sm text-slate-500">Chargement du jeu…</div>
          ) : loadError ? (
            <div className="flex flex-col items-center gap-3 text-center text-sm text-slate-600">
              <span>{loadError}</span>
              <button
                type="button"
                onClick={() => setReloadKey((n) => n + 1)}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm font-medium shadow-sm hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2"
              >
                ↻ Réessayer
              </button>
            </div>
          ) : !available.length ? (
            <div className="flex flex-col items-center gap-3 text-center text-sm text-slate-500">
              <span>Aucun type sélectionné. Active au moins une catégorie.</span>
              <button
                type="button"
                onClick={() => setActiveTypes(new Set(ACTIVE_TYPES))}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm font-medium shadow-sm hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2"
              >
                Activer tout
              </button>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              {current ? (
                <motion.div
                  key={current.id}
                  initial={{ rotateX: -6, opacity: 0 }}
                  animate={{ rotateX: 0, opacity: 1 }}
                  exit={{ opacity: 0, rotateX: 5 }}
                  transition={{ type: "spring", stiffness: 140, damping: 18 }}
                  whileHover={{ rotateX: -1.5, rotateY: 1.5, translateY: -4 }}
                  className="relative overflow-hidden rounded-2xl bg-white/80 px-4 py-6 shadow-[0_8px_30px_rgba(0,0,0,0.08)] backdrop-blur supports-[backdrop-filter]:bg-white/60"
                >
                  {currentMeta ? (
                    <div className="absolute left-5 top-5">
                      <CardBadge type={current.type} />
                    </div>
                  ) : null}
                  {current.type === "image" ? (
                    <motion.figure
                      className="relative"
                      initial={{ opacity: 0.85, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.28 }}
                      style={{ minHeight: "18rem" }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={current.imageUrl || ""}
                        alt="Inspiration"
                        className="w-full rounded-xl object-cover"
                        style={{ minHeight: "18rem", maxHeight: "30rem" }}
                        onError={() => {
                          const pool = deck.filter((card) => card.type === "image" && card.id !== current.id);
                          const fallback = rand(pool);
                          if (fallback) setCurrent(fallback);
                        }}
                      />
                      {current.credit ? (
                        <figcaption className="absolute bottom-3 right-4 inline-flex items-center rounded-full bg-white/85 px-2 py-1 text-[10px] font-medium text-slate-600 shadow">
                          {current.credit}
                        </figcaption>
                      ) : null}
                    </motion.figure>
                  ) : (
                    <motion.blockquote
                      key={`${current.id}-text`}
                      className="relative flex min-h-[18rem] items-center justify-center px-4 text-center text-2xl font-medium leading-snug text-slate-800 md:text-3xl"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.28 }}
                    >
                      <span className="absolute left-0 top-8 text-4xl text-amber-300" aria-hidden>«</span>
                      <span className="inline-block px-3">{current.text}</span>
                      <span className="absolute bottom-8 right-0 text-4xl text-amber-300" aria-hidden>»</span>
                    </motion.blockquote>
                  )}
                </motion.div>
              ) : (
                <motion.div key="empty" className="flex h-64 items-center justify-center text-sm text-slate-500" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  Aucun contenu disponible.
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500">
          <KeyboardHint />
          <button
            type="button"
            onClick={shuffleAll}
            className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white/70 px-3 py-1 font-medium text-slate-600 shadow-sm hover:bg-white"
          >
            ↻ Mélanger encore
          </button>
        </div>
      </div>
    </section>
  );
}
