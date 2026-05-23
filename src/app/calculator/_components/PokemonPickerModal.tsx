"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Image from "next/image";
import { api } from "~/trpc/react";
import { TypeBadge } from "~/app/_components/TypeBadge";
import { StatBar } from "~/app/_components/StatBar";
import { TypeFilterBar, HOTKEY_MAP } from "./TypeFilterBar";
import { useListKeyboard } from "~/hooks/useListKeyboard";
import { type PokemonSummary, type PokemonType } from "~/lib/types";

const SESSION_PICKS_KEY = "dxtr-champions-picks";

interface VgcPick { name: string; sprite: string; types: string[] }

interface PokemonPickerModalProps {
  label: string;
  current: PokemonSummary | null;
  onSelect: (p: PokemonSummary, evs: Record<string, number>, stages: Record<string, number>) => void;
  onClose: () => void;
}

// EV → effective stat at level 50, perfect IVs
function evStat(base: number, ev: number) {
  return Math.floor(((2 * base + 31 + Math.floor(ev / 4)) * 50) / 100) + 5;
}

export function PokemonPickerModal({ label, current, onSelect, onClose }: PokemonPickerModalProps) {
  const isAttacker = label === "Attacker";

  const statKeys = isAttacker
    ? [{ key: "attack" as const,   label: "Attack"  }, { key: "spAttack" as const,  label: "Sp. Atk" }]
    : [{ key: "defense" as const,  label: "Defense" }, { key: "spDefense" as const, label: "Sp. Def" }];

  const emptyEvs    = () => Object.fromEntries(statKeys.map(s => [s.key, 0]));
  const emptyStages = () => Object.fromEntries(statKeys.map(s => [s.key, 0]));

  const [query, setQuery]             = useState("");
  const [chosen, setChosen]           = useState<string | null>(null);
  const [typeFilters, setTypeFilters] = useState<PokemonType[]>([]);
  const [localEvs, setLocalEvs]       = useState<Record<string, number>>(emptyEvs);
  const [localStages, setLocalStages] = useState<Record<string, number>>(emptyStages);
  const [sessionPicks, setSessionPicks] = useState<VgcPick[]>([]);
  const [championsOnly, setChampionsOnly] = useState(true);

  const inputRef       = useRef<HTMLInputElement>(null);
  const onSelectRef    = useRef(onSelect);    onSelectRef.current    = onSelect;
  const onCloseRef     = useRef(onClose);     onCloseRef.current     = onClose;
  const pokemonRef     = useRef<PokemonSummary | undefined>(undefined);
  const chosenRef      = useRef(chosen);      chosenRef.current      = chosen;
  const isFetchingRef  = useRef(false);
  const localEvsRef    = useRef(localEvs);    localEvsRef.current    = localEvs;
  const localStagesRef = useRef(localStages); localStagesRef.current = localStages;

  const { data: allSummaries = [] } = api.pokemon.listSummaries.useQuery(undefined, { staleTime: Infinity });
  const { data: vgcData = [] }      = api.pokemon.getVgcTopPicks.useQuery(undefined, { staleTime: Infinity });

  const { data: pokemon, isFetching, error } = api.pokemon.search.useQuery(
    { query: chosen ?? "" },
    { enabled: !!chosen, retry: false },
  );

  pokemonRef.current    = pokemon;
  isFetchingRef.current = isFetching;

  // Session picks: randomly select 5 from top-20 once per browser session
  useEffect(() => {
    if (vgcData.length === 0 || sessionPicks.length > 0) return;
    const stored = sessionStorage.getItem(SESSION_PICKS_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as VgcPick[];
        const valid  = new Set(vgcData.map(p => p.name));
        if (parsed.length > 0 && parsed.every(p => valid.has(p.name))) {
          setSessionPicks(parsed); return;
        }
      } catch { /* ignore */ }
    }
    const pool: VgcPick[] = [...vgcData];
    const picks: VgcPick[] = [];
    while (picks.length < 5 && pool.length > 0) {
      picks.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]!);
    }
    sessionStorage.setItem(SESSION_PICKS_KEY, JSON.stringify(picks));
    setSessionPicks(picks);
  }, [vgcData.length, sessionPicks.length]);

  // Reset EVs/stages when a different pokemon is chosen
  useEffect(() => {
    setLocalEvs(emptyEvs());
    setLocalStages(emptyStages());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chosen]);

  // Focus input on mount
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, []);

  // Keyboard handler (stable — reads everything via refs)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { onCloseRef.current(); return; }

      // Ctrl+Enter = confirm currently previewed pokemon
      if (e.ctrlKey && e.key === "Enter") {
        e.preventDefault();
        const p = pokemonRef.current;
        if (p && chosenRef.current && !isFetchingRef.current) {
          onSelectRef.current(p, localEvsRef.current, localStagesRef.current);
          onCloseRef.current();
        }
        return;
      }

      // Digit keys toggle type filters (only when not typing)
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

  const championsSet = useMemo(
    () => new Set(vgcData.map(p => p.name)),
    [vgcData],
  );

  const matches = useMemo(() => {
    const hasQuery  = query.length >= 2;
    const hasFilter = typeFilters.length > 0;
    if (!hasQuery && !hasFilter) return [];
    const q = query.toLowerCase().replace(/\s/g, "-");
    const pool = championsOnly && championsSet.size > 0
      ? allSummaries.filter(s => championsSet.has(s.name))
      : allSummaries;
    return pool
      .filter(s => {
        const nameMatch = !hasQuery  || s.name.includes(q);
        const typeMatch = !hasFilter || typeFilters.every(f => s.types.includes(f));
        return nameMatch && typeMatch;
      })
      .slice(0, 20);
  }, [query, allSummaries, typeFilters, championsOnly, championsSet]);

  const { activeIndex } = useListKeyboard({
    count: matches.length,
    onConfirm: (i) => { const s = matches[i]; if (s) pick(s.name); },
    onEscape: onClose,
    enabled: matches.length > 0 && !chosen,
  });

  function pick(name: string) {
    setChosen(name);
    setQuery(name.replace(/-/g, " "));
  }

  function confirm() {
    if (!pokemon || !chosen || isFetching) return;
    onSelect(pokemon, localEvs, localStages);
    onClose();
  }

  function reset() {
    setChosen(null);
    setQuery("");
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="animate-fade-in relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-zinc-700 bg-zinc-950 shadow-2xl">
        <div className="p-5">

          {/* Header */}
          <div className="mb-4 flex items-center justify-between">
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

          {/* VGC quick picks */}
          {sessionPicks.length > 0 && (
            <div className="mb-4">
              <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
                Champions Picks
              </span>
              <div className="flex gap-1.5">
                {sessionPicks.map(vgcPick => (
                  <button
                    key={vgcPick.name}
                    onClick={() => pick(vgcPick.name)}
                    title={vgcPick.name.replace(/-/g, " ")}
                    className={`group flex flex-1 flex-col items-center gap-0.5 rounded-xl border py-1.5 transition ${
                      chosen === vgcPick.name
                        ? "border-violet-500/60 bg-violet-900/20"
                        : "border-zinc-800 bg-zinc-900/60 hover:border-zinc-700 hover:bg-zinc-800/60"
                    }`}
                  >
                    <Image src={vgcPick.sprite} alt={vgcPick.name} width={32} height={32} unoptimized className="drop-shadow-sm" />
                    <span className="w-full truncate px-1 text-center text-[9px] capitalize leading-tight text-zinc-600 group-hover:text-zinc-400">
                      {vgcPick.name.replace(/-/g, " ")}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Champions-only toggle */}
          <div className="mb-3 flex items-center justify-between">
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] font-medium text-zinc-400">Champions Only</span>
              <span className="text-[10px] text-zinc-600">
                {championsOnly ? "Showing VGC Champions pool" : "All Pokémon"}
              </span>
            </div>
            <button
              role="switch"
              aria-checked={championsOnly}
              onClick={() => setChampionsOnly(v => !v)}
              className={`relative h-5 w-9 rounded-full transition-colors duration-200 ${championsOnly ? "bg-violet-600" : "bg-zinc-700 hover:bg-zinc-600"}`}
            >
              <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${championsOnly ? "translate-x-4" : "translate-x-0"}`} />
            </button>
          </div>

          {/* Search input */}
          <div className="relative">
            <input
              ref={inputRef}
              value={query}
              onChange={e => { setQuery(e.target.value); setChosen(null); }}
              placeholder="Charizard, Garchomp, 006…"
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-white placeholder-zinc-500 outline-none transition focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30"
            />
            {matches.length > 0 && !chosen && (
              <ul className="absolute top-full z-10 mt-1 max-h-52 w-full overflow-y-auto rounded-xl border border-zinc-700 bg-zinc-900 py-1 shadow-2xl">
                {matches.map((s, i) => (
                  <li key={s.name}>
                    <button
                      onClick={() => pick(s.name)}
                      className={`flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-sm transition hover:bg-zinc-800 ${i === activeIndex ? "bg-zinc-800" : ""}`}
                    >
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-zinc-800/80">
                        <Image src={s.sprite} alt={s.name} width={24} height={24} unoptimized className="drop-shadow-sm" />
                      </div>
                      <span className="flex-1 capitalize text-zinc-300">{s.name.replace(/-/g, " ")}</span>
                      <div className="flex gap-1">
                        {(s.types as PokemonType[]).map(t => <TypeBadge key={t} type={t} size="sm" />)}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Type filter bar */}
          <div className="mt-3 border-t border-zinc-800/60 pt-3">
            <TypeFilterBar selected={typeFilters} onChange={setTypeFilters} />
          </div>

          {/* Loading */}
          {isFetching && (
            <div className="relative mt-4 flex h-20 items-center justify-center overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
              <div className="shimmer absolute inset-0" />
              <span className="relative z-10 text-xs text-zinc-600">Loading…</span>
            </div>
          )}

          {/* Error */}
          {error && <p className="mt-3 text-xs text-red-400">{error.message}</p>}

          {/* Result card */}
          {pokemon && chosen && !isFetching && (
            <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900 p-4">

              {/* Pokemon identity */}
              <div className="flex items-start gap-4">
                <div className="flex h-[80px] w-[80px] shrink-0 items-center justify-center rounded-xl bg-zinc-800/80">
                  <Image src={pokemon.sprite} alt={pokemon.name} width={72} height={72} unoptimized className="drop-shadow-lg" />
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate font-bold capitalize tracking-tight text-white">{pokemon.name}</h3>
                    <span className="shrink-0 text-xs text-zinc-500">#{String(pokemon.pokeApiId).padStart(3, "0")}</span>
                  </div>
                  <div className="flex gap-1">
                    {pokemon.types.map(t => <TypeBadge key={t} type={t as PokemonType} size="sm" />)}
                  </div>
                  <div className="flex flex-col gap-0.5 pt-0.5">
                    <StatBar label="HP"     value={pokemon.baseStats.hp} />
                    <StatBar label="Atk"    value={pokemon.baseStats.attack} />
                    <StatBar label="Def"    value={pokemon.baseStats.defense} />
                    <StatBar label="Sp.Atk" value={pokemon.baseStats.spAttack} />
                    <StatBar label="Sp.Def" value={pokemon.baseStats.spDefense} />
                    <StatBar label="Speed"  value={pokemon.baseStats.speed} />
                  </div>
                </div>
              </div>

              {/* EV sliders */}
              <div className="mt-3 border-t border-zinc-800/60 pt-3">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600">EVs (Lv 50)</span>
                <div className="mt-2 flex flex-col gap-2">
                  {statKeys.map(({ key, label: statLabel }) => {
                    const base = pokemon.baseStats[key] ?? 0;
                    const ev   = localEvs[key] ?? 0;
                    return (
                      <div key={key}>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-zinc-500">{statLabel}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] tabular-nums text-zinc-600">{ev} EV</span>
                            <span className="min-w-[1.8rem] text-right text-[11px] font-bold tabular-nums text-violet-400">{evStat(base, ev)}</span>
                          </div>
                        </div>
                        <input
                          type="range" min={0} max={252} step={4} value={ev}
                          onChange={e => setLocalEvs(prev => ({ ...prev, [key]: Number(e.target.value) }))}
                          className="mt-1 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-zinc-700/60 accent-violet-500"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Stat stages */}
              <div className="mt-3 border-t border-zinc-800/60 pt-3">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600">Stages</span>
                <div className="mt-2 flex flex-col gap-1.5">
                  {statKeys.map(({ key, label: statLabel }) => {
                    const stage = localStages[key] ?? 0;
                    const valueColor = stage > 0 ? "text-green-400" : stage < 0 ? "text-red-400" : "text-zinc-600";
                    return (
                      <div key={key} className="flex items-center justify-between">
                        <span className="text-[11px] text-zinc-500">{statLabel}</span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setLocalStages(prev => ({ ...prev, [key]: Math.max(-6, (prev[key] ?? 0) - 1) }))}
                            disabled={stage <= -6}
                            className="flex h-5 w-5 items-center justify-center rounded-md bg-zinc-800 text-sm leading-none text-zinc-400 transition hover:bg-zinc-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-25"
                          >−</button>
                          <span className={`w-7 rounded-md py-0.5 text-center text-[11px] font-bold tabular-nums ${valueColor}`}>
                            {stage > 0 ? `+${stage}` : stage}
                          </span>
                          <button
                            onClick={() => setLocalStages(prev => ({ ...prev, [key]: Math.min(6, (prev[key] ?? 0) + 1) }))}
                            disabled={stage >= 6}
                            className="flex h-5 w-5 items-center justify-center rounded-md bg-zinc-800 text-sm leading-none text-zinc-400 transition hover:bg-zinc-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-25"
                          >+</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Actions */}
              <div className="mt-4 flex gap-2">
                <button
                  onClick={confirm}
                  className="flex-1 rounded-xl bg-violet-600 py-2 text-sm font-semibold text-white transition hover:bg-violet-500"
                >
                  Use as {label}
                </button>
                <button
                  onClick={reset}
                  className="rounded-xl border border-zinc-700 px-3 py-2 text-sm text-zinc-400 transition hover:border-zinc-600 hover:text-white"
                >
                  Clear
                </button>
              </div>
              <p className="mt-2 text-center text-[10px] text-zinc-700">
                <kbd className="rounded bg-zinc-900 px-1 py-0.5 font-mono text-zinc-600">Ctrl</kbd>
                {" + "}
                <kbd className="rounded bg-zinc-900 px-1 py-0.5 font-mono text-zinc-600">Enter</kbd>
                {" to confirm"}
              </p>
            </div>
          )}

          {/* Empty state with type filters */}
          {!pokemon && !isFetching && !chosen && matches.length === 0 && typeFilters.length > 0 && query.length < 2 && (
            <p className="mt-4 text-center text-xs text-zinc-600">
              No Pokémon match <span className="capitalize text-zinc-500">{typeFilters.join(" + ")}</span>. Try fewer filters.
            </p>
          )}

          {/* Keep-current hint */}
          {current && !pokemon && (
            <p className="mt-3 text-center text-xs text-zinc-600">
              Press <kbd className="rounded bg-zinc-800 px-1 py-0.5 font-mono text-[10px] text-zinc-500">Esc</kbd> or click outside to keep{" "}
              <span className="capitalize text-zinc-500">{current.name}</span>
            </p>
          )}

          {/* Type hotkey hint */}
          <p className="mt-2 text-center text-[10px] text-zinc-700">
            Keys <kbd className="rounded bg-zinc-900 px-0.5 font-mono text-zinc-600">1</kbd>–
            <kbd className="rounded bg-zinc-900 px-0.5 font-mono text-zinc-600">0</kbd> toggle first 10 types when not typing
          </p>

        </div>
      </div>
    </div>
  );
}
