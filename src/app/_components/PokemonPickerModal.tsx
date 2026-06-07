"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Image from "next/image";
import { api } from "~/trpc/react";
import { TypeBadge } from "./TypeBadge";
import { StatBar } from "./StatBar";
import { TypeFilterBar, HOTKEY_MAP } from "~/app/calculator/_components/TypeFilterBar";
import { useListKeyboard } from "~/hooks/useListKeyboard";
import { type PokemonSummary, type PokemonType } from "~/lib/types";

interface PokemonPickerModalProps {
  label: string;
  current?: PokemonSummary | null;
  onSelect: (p: PokemonSummary) => void;
  onClose: () => void;
  confirmLabel?: string;
  disabledNames?: string[];
}

export function PokemonPickerModal({ label, current, onSelect, onClose, confirmLabel, disabledNames }: PokemonPickerModalProps) {
  const disabledSet = new Set(disabledNames ?? []);
  const [query, setQuery]             = useState("");
  const [chosen, setChosen]           = useState<string | null>(null);
  const [typeFilters, setTypeFilters] = useState<PokemonType[]>([]);
  const [championsOnly, setChampionsOnly] = useState(true);

  const inputRef    = useRef<HTMLInputElement>(null);
  const onSelectRef = useRef(onSelect); onSelectRef.current = onSelect;
  const onCloseRef  = useRef(onClose);  onCloseRef.current  = onClose;
  const pokemonRef  = useRef<PokemonSummary | undefined>(undefined);
  const chosenRef   = useRef(chosen);   chosenRef.current   = chosen;
  const isFetchingRef = useRef(false);

  const { data: allSummaries = [] } = api.pokemon.listSummaries.useQuery(undefined, { staleTime: Infinity });
  const { data: vgcData = [] }      = api.pokemon.getVgcTopPicks.useQuery(undefined, { staleTime: Infinity });

  const { data: pokemon, isFetching, error } = api.pokemon.search.useQuery(
    { query: chosen ?? "" },
    { enabled: !!chosen, retry: false },
  );

  pokemonRef.current    = pokemon;
  isFetchingRef.current = isFetching;

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { onCloseRef.current(); return; }

      if (e.ctrlKey && e.key === "Enter") {
        e.preventDefault();
        const p = pokemonRef.current;
        if (p && chosenRef.current && !isFetchingRef.current) {
          onSelectRef.current(p);
        }
        return;
      }

      const el = document.activeElement;
      const inInput = el === inputRef.current || el?.tagName === "INPUT" || el?.tagName === "TEXTAREA";
      if (!inInput && HOTKEY_MAP[e.key]) {
        e.preventDefault();
        const type = HOTKEY_MAP[e.key]!;
        setTypeFilters(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const matches = useMemo(() => {
    const pool: Array<{ name: string; sprite: string; types: string[] }> =
      championsOnly && vgcData.length > 0 ? vgcData : allSummaries;
    if (!query && typeFilters.length === 0) return pool.slice(0, 30);
    const q = query.toLowerCase().replace(/\s/g, "-");
    return pool
      .filter(s => {
        const nameMatch = !query || s.name.includes(q);
        const typeMatch = typeFilters.length === 0 || typeFilters.every(f => s.types.includes(f));
        return nameMatch && typeMatch;
      })
      .slice(0, 30);
  }, [query, allSummaries, vgcData, typeFilters, championsOnly]);

  const [pendingConfirm, setPendingConfirm] = useState(false);

  useEffect(() => {
    if (pendingConfirm && pokemon && chosen && !isFetching) {
      setPendingConfirm(false);
      onSelectRef.current(pokemon);
      onCloseRef.current();
    }
  }, [pendingConfirm, pokemon, chosen, isFetching]);

  const { activeIndex } = useListKeyboard({
    count: matches.length,
    onConfirm: (i) => { const s = matches[i]; if (s) pick(s.name); },
    onEscape: onClose,
    enabled: matches.length > 0 && !chosen,
  });

  function pick(name: string) {
    if (disabledSet.has(name)) return;
    setChosen(name);
    // Intentionally NOT updating query — preserves the current search filter
  }

  function pickAndConfirm(name: string) {
    if (disabledSet.has(name)) return;
    setPendingConfirm(true);
    setChosen(name);
  }

  function confirm() {
    if (!pokemon || !chosen || isFetching) return;
    onSelect(pokemon);
    onClose();
  }

  function reset() {
    setChosen(null);
    setQuery("");
    setPendingConfirm(false);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  const buttonLabel = confirmLabel ?? `Select ${label}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="animate-fade-in relative flex h-[min(90vh,680px)] w-full max-w-[820px] overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-950 shadow-2xl">

        {/* ── LEFT: search + grid ── */}
        <div className="flex min-w-0 flex-1 flex-col border-r border-zinc-800/60">

          {/* Header */}
          <div className="flex shrink-0 items-center justify-between border-b border-zinc-800/60 px-4 py-3">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
              Select {label}
            </span>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-zinc-800 hover:text-zinc-200"
              aria-label="Close"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Champions toggle + search */}
          <div className="shrink-0 px-4 pt-3 pb-2.5">
            <div className="mb-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  role="switch"
                  aria-checked={championsOnly}
                  onClick={() => setChampionsOnly(v => !v)}
                  className={`relative h-4 w-8 rounded-full transition-colors duration-200 ${championsOnly ? "bg-violet-600" : "bg-zinc-700 hover:bg-zinc-600"}`}
                >
                  <span className={`absolute top-0.5 left-0.5 h-3 w-3 rounded-full bg-white shadow-sm transition-transform duration-200 ${championsOnly ? "translate-x-4" : "translate-x-0"}`} />
                </button>
                <span className="text-[11px] font-medium text-zinc-500">
                  {championsOnly ? "Champions pool" : "All Pokémon"}
                </span>
              </div>
              <span className="text-[10px] tabular-nums text-zinc-700">
                {matches.length} shown
              </span>
            </div>
            <input
              ref={inputRef}
              value={query}
              onChange={e => { setQuery(e.target.value); setChosen(null); }}
              placeholder="Search by name…"
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-600 outline-none transition focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30"
            />
          </div>

          {/* Type filter */}
          <div className="shrink-0 border-t border-zinc-800/60 px-4 py-2">
            <TypeFilterBar selected={typeFilters} onChange={setTypeFilters} />
          </div>

          {/* Results grid */}
          <div className="flex-1 overflow-y-auto px-4 py-3">
            {matches.length > 0 ? (
              <div className="grid grid-cols-5 gap-1.5">
                {matches.map((s, i) => {
                  const isDisabled = disabledSet.has(s.name);
                  return (
                    <button
                      key={s.name}
                      onClick={() => pick(s.name)}
                      onDoubleClick={() => pickAndConfirm(s.name)}
                      disabled={isDisabled}
                      title={isDisabled ? "Already in your team" : undefined}
                      className={`group relative flex flex-col items-center gap-1 rounded-xl border p-2 text-center transition ${
                        isDisabled
                          ? "cursor-not-allowed border-zinc-800/30 bg-zinc-900/20 opacity-40"
                          : chosen === s.name
                          ? "border-violet-500/50 bg-violet-900/20"
                          : i === activeIndex
                          ? "border-zinc-600 bg-zinc-800"
                          : "border-zinc-800/50 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-800/60"
                      }`}
                    >
                      <Image
                        src={s.sprite}
                        alt={s.name}
                        width={48}
                        height={48}
                        unoptimized
                        className="drop-shadow-sm"
                      />
                      <span className={`w-full truncate text-[9px] capitalize leading-tight ${isDisabled ? "text-zinc-700" : "text-zinc-500 group-hover:text-zinc-300"}`}>
                        {s.name.replace(/-/g, " ")}
                      </span>
                      {isDisabled && (
                        <span className="absolute top-1 right-1 rounded bg-zinc-800 px-1 py-px text-[8px] font-bold text-zinc-600">
                          ✓
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="mt-8 text-center text-xs text-zinc-600">
                No Pokémon matching &ldquo;{query}&rdquo;
              </p>
            )}
            <p className="mt-4 text-center text-[10px] text-zinc-800">
              <kbd className="rounded bg-zinc-900 px-0.5 font-mono text-zinc-700">1</kbd>
              {" – "}
              <kbd className="rounded bg-zinc-900 px-0.5 font-mono text-zinc-700">0</kbd>
              {" toggle type filters · "}
              <kbd className="rounded bg-zinc-900 px-1 py-0.5 font-mono text-zinc-700">↑↓</kbd>
              {" navigate · "}
              <kbd className="rounded bg-zinc-900 px-1 py-0.5 font-mono text-zinc-700">Enter</kbd>
              {" select"}
            </p>
          </div>

        </div>

        {/* ── RIGHT: detail panel ── */}
        <div className="flex w-64 shrink-0 flex-col overflow-y-auto">

          {isFetching ? (
            <div className="relative flex flex-1 items-center justify-center">
              <div className="shimmer absolute inset-0" />
              <span className="relative z-10 text-xs text-zinc-600">Loading…</span>
            </div>

          ) : pokemon && chosen ? (
            <div className="flex flex-1 flex-col gap-4 p-4">

              {/* Identity */}
              <div className="flex items-start gap-3">
                <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-xl bg-zinc-800/80">
                  <Image
                    src={pokemon.sprite}
                    alt={pokemon.name}
                    width={64}
                    height={64}
                    unoptimized
                    className="drop-shadow-lg"
                  />
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate font-bold capitalize tracking-tight text-white">
                      {pokemon.name.replace(/-/g, " ")}
                    </h3>
                    <span className="shrink-0 text-xs text-zinc-500">
                      #{String(pokemon.pokeApiId).padStart(3, "0")}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    {pokemon.types.map(t => <TypeBadge key={t} type={t} size="sm" />)}
                  </div>
                </div>
              </div>

              {/* Base stats */}
              <div className="flex flex-col gap-0.5">
                <StatBar label="HP"     value={pokemon.baseStats.hp} />
                <StatBar label="Atk"    value={pokemon.baseStats.attack} />
                <StatBar label="Def"    value={pokemon.baseStats.defense} />
                <StatBar label="Sp.Atk" value={pokemon.baseStats.spAttack} />
                <StatBar label="Sp.Def" value={pokemon.baseStats.spDefense} />
                <StatBar label="Speed"  value={pokemon.baseStats.speed} />
              </div>

              {/* BST */}
              <div className="rounded-lg bg-zinc-900 px-3 py-2 text-center">
                <span className="text-[10px] text-zinc-600">BST </span>
                <span className="font-bold tabular-nums text-zinc-300">
                  {Object.values(pokemon.baseStats).reduce((a, b) => a + b, 0)}
                </span>
              </div>

              {/* Actions */}
              <div className="mt-auto flex flex-col gap-2 pt-2">
                {error && <p className="text-xs text-red-400">{error.message}</p>}
                <div className="flex gap-2">
                  <button
                    onClick={confirm}
                    className="flex-1 rounded-xl bg-violet-600 py-2 text-sm font-semibold text-white transition hover:bg-violet-500"
                  >
                    {buttonLabel}
                  </button>
                  <button
                    onClick={reset}
                    className="rounded-xl border border-zinc-700 px-3 py-2 text-sm text-zinc-400 transition hover:border-zinc-600 hover:text-white"
                  >
                    Clear
                  </button>
                </div>
                <p className="text-center text-[10px] text-zinc-700">
                  <kbd className="rounded bg-zinc-900 px-1 py-0.5 font-mono text-zinc-600">Ctrl</kbd>
                  {" + "}
                  <kbd className="rounded bg-zinc-900 px-1 py-0.5 font-mono text-zinc-600">Enter</kbd>
                  {" to confirm"}
                </p>
              </div>

            </div>

          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full border border-dashed border-zinc-800">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-zinc-800">
                  <circle cx="12" cy="8" r="5" />
                  <path d="M3 21v-1a9 9 0 0 1 18 0v1" />
                </svg>
              </div>
              <p className="text-xs text-zinc-600">
                {current
                  ? <>Keep <span className="capitalize text-zinc-500">{current.name.replace(/-/g, " ")}</span> or pick a new one</>
                  : "Click a Pokémon to preview"}
              </p>
              {current && (
                <p className="text-[10px] text-zinc-700">
                  Press <kbd className="rounded bg-zinc-900 px-1 py-0.5 font-mono text-zinc-600">Esc</kbd> to keep current
                </p>
              )}
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
