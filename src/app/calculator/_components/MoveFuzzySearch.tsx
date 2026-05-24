"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import { api } from "~/trpc/react";
import { TypeBadge } from "~/app/_components/TypeBadge";
import { useMovePrefetch } from "~/hooks/useMovePrefetch";
import { useListKeyboard }  from "~/hooks/useListKeyboard";
import { type MoveDetail, type PokemonType } from "~/lib/types";

// ─── Stat chip ────────────────────────────────────────────────────────────────

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-1">
      <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-600">{label}</span>
      <span className="font-mono text-xs font-semibold text-zinc-300">{value}</span>
    </div>
  );
}

// ─── Move picker modal ────────────────────────────────────────────────────────

interface MovePickerModalProps {
  moveNames:      string[];
  onSelect:       (move: MoveDetail) => void;
  onClear:        () => void;
  onClose:        () => void;
  attackerSprite?: string;
  attackerName?:  string;
  attackingOnly?: boolean;
}

function MovePickerModal({ moveNames, onSelect, onClear, onClose, attackerSprite, attackerName, attackingOnly }: MovePickerModalProps) {
  const [query, setQuery] = useState("");
  const [fetching, setFetching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const utils = api.useUtils();
  const moveSummaries = useMovePrefetch(moveNames, true);

  useEffect(() => {
    // Delay focus slightly so the animation doesn't fight with layout
    const t = setTimeout(() => inputRef.current?.focus(), 60);
    return () => clearTimeout(t);
  }, []);

  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  }, [onClose]);

  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  const filtered = useMemo(() => {
    const base = query
      ? moveNames.filter(n => n.includes(query.toLowerCase().replace(/\s/g, "-")))
      : moveNames;
    const sliced = base.slice(0, 60);
    if (!attackingOnly) return sliced;
    return sliced.filter(n => {
      const s = moveSummaries.get(n);
      return !s || s.category !== "status";
    });
  }, [query, moveNames, moveSummaries, attackingOnly]);

  async function handleSelect(moveName: string) {
    setFetching(true);
    try {
      const move = await utils.pokemon.getMove.fetch({ moveName });
      onSelect(move);
    } finally {
      setFetching(false);
    }
  }

  const { activeIndex } = useListKeyboard({
    count: filtered.length,
    onConfirm: (i) => { const name = filtered[i]; if (name) void handleSelect(name); },
    onEscape: onClose,
    enabled: !fetching && filtered.length > 0,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-zinc-950/75 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="animate-fade-in relative w-full max-w-md overflow-hidden rounded-2xl border border-zinc-700/60 bg-zinc-900 shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800/60 px-4 py-3">
          <div className="flex items-center gap-2.5">
            {attackerSprite && (
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-800">
                <Image src={attackerSprite} alt={attackerName ?? ""} width={24} height={24} unoptimized className="drop-shadow-sm" />
              </div>
            )}
            <span className="text-sm font-semibold text-zinc-200">Change Move</span>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-600 transition hover:text-zinc-300"
            aria-label="Close"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="p-3">
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search moves…"
            className="w-full rounded-xl border border-zinc-800 bg-zinc-800/60 px-3 py-2.5 text-sm text-white placeholder-zinc-600 outline-none transition focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30"
          />
        </div>

        {/* Results */}
        {fetching ? (
          <div className="flex items-center justify-center py-10">
            <span className="text-sm text-zinc-500">Loading…</span>
          </div>
        ) : (
          <ul className="max-h-72 overflow-y-auto px-3 pb-2">
            {filtered.map((name, i) => {
              const summary = moveSummaries.get(name);
              return (
                <li key={name}>
                  <button
                    onClick={() => handleSelect(name)}
                    className={`group flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition hover:bg-zinc-800 ${
                      i === activeIndex ? "bg-zinc-800" : ""
                    }`}
                  >
                    {summary?.type
                      ? <TypeBadge type={summary.type} size="sm" />
                      : <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-700 transition group-hover:bg-violet-500" />
                    }
                    <span className="flex-1 capitalize text-zinc-400 transition group-hover:text-white">
                      {name.replace(/-/g, " ")}
                    </span>
                    {summary?.power != null && (
                      <span className="shrink-0 font-mono text-[10px] text-zinc-600">{summary.power}</span>
                    )}
                    {summary?.category && (
                      <span className="shrink-0 rounded bg-zinc-800/80 px-1 text-[9px] uppercase tracking-wide text-zinc-600">
                        {summary.category === "physical" ? "phys" : summary.category === "special" ? "spec" : "stat"}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
            {filtered.length === 0 && (
              <li className="px-3 py-6 text-center text-xs text-zinc-600">
                No moves matching &ldquo;{query}&rdquo;
              </li>
            )}
          </ul>
        )}

        {/* Footer — remove option */}
        <div className="border-t border-zinc-800/60 px-4 py-2.5">
          <button
            onClick={() => { onClear(); onClose(); }}
            className="text-xs text-zinc-600 transition hover:text-red-400"
          >
            Remove move
          </button>
        </div>

      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface MoveFuzzySearchProps {
  moveNames:        string[];
  value:            MoveDetail | null;
  onSelect:         (move: MoveDetail) => void;
  onClear:          () => void;
  inputRef?:        React.RefObject<HTMLInputElement | null>;
  isLoadingMove?:   boolean;
  attackerSprite?:  string;
  attackerName?:    string;
  /** Caller-owned ref populated with a function that opens the picker modal */
  openModalRef?:    React.RefObject<(() => void) | null>;
  attackingOnly?:   boolean;
}

export function MoveFuzzySearch({ moveNames, value, onSelect, onClear, inputRef, isLoadingMove, attackerSprite, attackerName, openModalRef, attackingOnly }: MoveFuzzySearchProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const utils = api.useUtils();

  // Register open function in caller-owned ref so K shortcut can trigger the modal externally
  useEffect(() => {
    if (openModalRef) openModalRef.current = () => setModalOpen(true);
    return () => { if (openModalRef) openModalRef.current = null; };
  }, [openModalRef]);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  // Lazy prefetch so inline search can filter status moves as summaries arrive
  const moveSummaries = useMovePrefetch(moveNames, attackingOnly ?? false);

  const filtered = useMemo(() => {
    const base = query
      ? moveNames.filter(n => n.includes(query.toLowerCase().replace(/\s/g, "-")))
      : moveNames;
    const sliced = base.slice(0, 40);
    if (!attackingOnly) return sliced;
    return sliced.filter(n => {
      const s = moveSummaries.get(n);
      return !s || s.category !== "status";
    });
  }, [query, moveNames, moveSummaries, attackingOnly]);

  async function handleInlineSelect(moveName: string) {
    setOpen(false);
    setLoading(true);
    try {
      const move = await utils.pokemon.getMove.fetch({ moveName });
      setQuery("");
      onSelect(move);
    } finally {
      setLoading(false);
    }
  }

  function handleModalSelect(move: MoveDetail) {
    onSelect(move);
    setModalOpen(false);
  }

  const { activeIndex: inlineActiveIndex } = useListKeyboard({
    count: filtered.length,
    onConfirm: (i) => { const name = filtered[i]; if (name) void handleInlineSelect(name); },
    enabled: open && filtered.length > 0,
  });

  // ── Skeleton while randomize is fetching ──────────────────────────────────
  if (isLoadingMove ?? loading) {
    return (
      <div className="flex flex-col gap-2 rounded-xl border border-zinc-800/60 bg-zinc-900 px-3 py-3">
        <div className="h-3 w-20 animate-pulse rounded bg-zinc-800" />
        <div className="h-3 w-32 animate-pulse rounded bg-zinc-800/60" />
      </div>
    );
  }

  // ── Filled state — click to open change modal ─────────────────────────────
  if (value) {
    return (
      <>
        <div
          role="button"
          tabIndex={0}
          onClick={() => setModalOpen(true)}
          onKeyDown={e => { if (e.key === "Enter" || e.key === " ") setModalOpen(true); }}
          style={{ "--type-glow": `var(--color-type-${value.type})` } as React.CSSProperties}
          className="group relative cursor-pointer rounded-xl border border-zinc-800 bg-zinc-900 p-3 shadow-[0_0_14px_color-mix(in_srgb,var(--type-glow)_20%,transparent)] transition hover:border-zinc-600 hover:bg-zinc-800/40 hover:shadow-[0_0_22px_color-mix(in_srgb,var(--type-glow)_35%,transparent)]"
        >
          {/* Edit indicator — slides in from top-right on hover */}
          <div className="absolute top-2.5 right-2.5 flex items-center gap-1 rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1 opacity-0 transition-all duration-150 group-hover:opacity-100">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-violet-400">
              <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
            </svg>
            <span className="text-[10px] font-semibold text-zinc-400">edit</span>
          </div>

          {/* Top row */}
          <div className="flex items-center gap-2.5 pr-14">
            <TypeBadge type={value.type as PokemonType} size="sm" />
            <span className="flex-1 truncate text-sm font-semibold capitalize text-white">
              {value.name.replace(/-/g, " ")}
            </span>
            <span className="shrink-0 rounded-md bg-zinc-800 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
              {value.category}
            </span>
          </div>

          {/* Stats row */}
          <div className="mt-2 flex gap-4">
            <StatChip label="Power" value={value.power != null ? String(value.power) : "—"} />
            <StatChip label="Acc" value={value.accuracy != null ? `${value.accuracy}%` : "—"} />
            <StatChip label="PP" value={String(value.pp)} />
          </div>

          {/* Effect */}
          {value.effect && (
            <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">{value.effect}</p>
          )}
        </div>

        {modalOpen && (
          <MovePickerModal
            moveNames={moveNames}
            onSelect={handleModalSelect}
            onClear={onClear}
            onClose={() => setModalOpen(false)}
            attackerSprite={attackerSprite}
            attackerName={attackerName}
            attackingOnly={attackingOnly}
          />
        )}
      </>
    );
  }

  // ── Empty state — inline fuzzy search ────────────────────────────────────
  return (
    <div ref={containerRef} className="relative">
      <input
        ref={inputRef}
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder={moveNames.length === 0 ? "Select an attacker first…" : "Filter attacker's moves…"}
        disabled={moveNames.length === 0}
        className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-600 outline-none transition focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 disabled:cursor-not-allowed disabled:opacity-40"
      />

      {open && filtered.length > 0 && (
        <ul className="absolute top-full z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-zinc-700 bg-zinc-950 py-1 shadow-2xl">
          {filtered.map((name, i) => (
            <li key={name}>
              <button
                onClick={() => handleInlineSelect(name)}
                className={`group flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition hover:bg-zinc-800/80 ${
                  i === inlineActiveIndex ? "bg-zinc-800/80" : ""
                }`}
              >
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-700 transition group-hover:bg-violet-500" />
                <span className="capitalize text-zinc-400 transition group-hover:text-white">
                  {name.replace(/-/g, " ")}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && query.length >= 2 && filtered.length === 0 && (
        <div className="absolute top-full z-20 mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-3 text-xs text-zinc-500 shadow-2xl">
          No moves matching &ldquo;{query}&rdquo;
        </div>
      )}
    </div>
  );
}
