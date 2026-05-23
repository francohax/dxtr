"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { api } from "~/trpc/react";
import { calculateDamage, getTypeEffectiveness } from "~/lib/damage";
import { type DamageResult } from "~/lib/damage";
import { type PokemonSummary, type MoveDetail, type PokemonType } from "~/lib/types";
import { DamageResultCard } from "./DamageResult";
import { TypeBadge } from "~/app/_components/TypeBadge";
import { useKeyboardShortcuts } from "~/hooks/useKeyboardShortcuts";

const STORAGE_KEY = "dxtr-random-battle";

interface PokemonPickerProps {
  label: string;
  value: PokemonSummary | null;
  onPick: (p: PokemonSummary) => void;
  onClear: () => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

function PokemonPicker({ label, value, onPick, onClear, inputRef }: PokemonPickerProps) {
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");

  const { data, isFetching, error } = api.pokemon.search.useQuery(
    { query: submitted },
    { enabled: !!submitted, retry: false }
  );

  return (
    <div className="flex flex-col gap-2">
      <span className="text-[11px] font-semibold uppercase tracking-widest text-zinc-600">{label}</span>

      {value ? (
        /* Filled card — prominent sprite */
        <div className="group relative flex flex-col items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900 p-4 transition hover:border-zinc-700">
          <div className="relative flex h-20 w-20 items-center justify-center rounded-xl bg-zinc-800/80">
            <Image src={value.sprite} alt={value.name} width={72} height={72} unoptimized className="drop-shadow-lg" />
          </div>
          <div className="flex flex-col items-center gap-1">
            <p className="text-sm font-bold capitalize tracking-tight text-white">{value.name}</p>
            <div className="flex gap-1">
              {value.types.map(t => <TypeBadge key={t} type={t as PokemonType} size="sm" />)}
            </div>
          </div>
          <button
            onClick={() => { setSubmitted(""); setQuery(""); onClear(); }}
            className="absolute top-2 right-2 rounded-lg p-1 text-zinc-600 opacity-0 transition hover:text-zinc-300 group-hover:opacity-100"
            aria-label="Change"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
        </div>
      ) : (
        /* Empty state — ghost dashed slot */
        <div className="flex flex-col gap-2">
          <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/50 py-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-dashed border-zinc-700 text-zinc-700">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <span className="text-xs text-zinc-700">No Pokémon selected</span>
          </div>
          <form onSubmit={e => { e.preventDefault(); setSubmitted(query.trim()); }} className="flex gap-2">
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search by name…"
              className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-600 outline-none transition focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30"
            />
            <button
              type="submit"
              disabled={!query || isFetching}
              className="rounded-xl bg-violet-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-violet-500 disabled:opacity-50"
            >
              {isFetching ? "…" : "Find"}
            </button>
          </form>
        </div>
      )}

      {error && <p className="text-xs text-red-400">{error.message}</p>}
      {data && !value && (
        <button
          onClick={() => onPick(data)}
          className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-2 text-left text-sm transition hover:border-violet-600 hover:bg-violet-950/30"
        >
          <Image src={data.sprite} alt={data.name} width={28} height={28} unoptimized />
          <span className="font-semibold capitalize text-white">{data.name}</span>
          <span className="ml-auto text-xs text-zinc-600">↵ use</span>
        </button>
      )}
    </div>
  );
}

export function DamageCalculator() {
  const [attacker, setAttacker] = useState<PokemonSummary | null>(null);
  const [defender, setDefender] = useState<PokemonSummary | null>(null);
  const [moveQuery, setMoveQuery] = useState("");
  const [moveSubmitted, setMoveSubmitted] = useState("");
  const [result, setResult] = useState<{ dmg: DamageResult; move: MoveDetail } | null>(null);

  const [randomEnabled, setRandomEnabled] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const stored = sessionStorage.getItem(STORAGE_KEY);
    return stored === null ? true : stored === "true";
  });

  const { data: allNames = [] } = api.pokemon.listNames.useQuery(undefined, {
    staleTime: Infinity,
  });

  const utils = api.useUtils();

  const attackerInputRef = useRef<HTMLInputElement>(null);
  const defenderInputRef = useRef<HTMLInputElement>(null);
  const moveInputRef = useRef<HTMLInputElement>(null);

  const { data: moveData, isFetching: moveFetching, error: moveError } =
    api.pokemon.getMove.useQuery(
      { moveName: moveSubmitted },
      { enabled: !!moveSubmitted, retry: false }
    );

  function calculate() {
    if (!attacker || !defender || !moveData) return;
    const isPhysical = moveData.category === "physical";
    const attackStat  = isPhysical ? attacker.baseStats.attack   : attacker.baseStats.spAttack;
    const defenseStat = isPhysical ? defender.baseStats.defense  : defender.baseStats.spDefense;
    const stab = attacker.types.includes(moveData.type as PokemonType);
    const te   = getTypeEffectiveness(moveData.type as PokemonType, defender.types as PokemonType[]);
    const dmg  = calculateDamage({ level: 50, power: moveData.power ?? 0, attackStat, defenseStat, stab, typeEffectiveness: te });
    setResult({ dmg, move: moveData });
  }

  const randomizeBattle = useCallback(async () => {
    if (allNames.length === 0) return;

    const pick = () => allNames[Math.floor(Math.random() * allNames.length)]!;
    const attName = pick();
    let defName = pick();
    while (defName === attName && allNames.length > 1) defName = pick();

    setResult(null);

    const [att, def] = await Promise.all([
      utils.pokemon.search.fetch({ query: attName }),
      utils.pokemon.search.fetch({ query: defName }),
    ]);
    setAttacker(att);
    setDefender(def);
    setMoveQuery("");
    setMoveSubmitted("");

    const candidates = [...att.moveNames].sort(() => Math.random() - 0.5);
    for (const moveName of candidates.slice(0, 10)) {
      try {
        const move = await utils.pokemon.getMove.fetch({ moveName });
        if (move.power !== null && move.power > 0 && move.category !== "status") {
          setMoveQuery(moveName.replace(/-/g, " "));
          setMoveSubmitted(moveName);
          break;
        }
      } catch {
        // skip unavailable moves
      }
    }
  }, [allNames, utils]);

  const hasRandomized = useRef(false);
  useEffect(() => {
    if (randomEnabled && allNames.length > 0 && !hasRandomized.current) {
      hasRandomized.current = true;
      void randomizeBattle();
    }
  }, [randomEnabled, allNames.length, randomizeBattle]);

  useKeyboardShortcuts({
    onSubmit: () => {
      if (attacker && defender && moveData) calculate();
    },
    onSearch: () => {
      if (!attacker) {
        attackerInputRef.current?.focus();
      } else if (!defender) {
        defenderInputRef.current?.focus();
      } else {
        moveInputRef.current?.focus();
      }
    },
  });

  return (
    <div className="flex flex-col gap-5">

      {/* Random scenario toggle */}
      <div className="flex items-center justify-between rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-4 py-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium text-zinc-200">Random Battle</span>
          <span className="text-xs text-zinc-600">
            {randomEnabled ? "Auto-loads a random matchup" : "Manual input mode"}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {randomEnabled && (
            <button
              onClick={() => void randomizeBattle()}
              disabled={allNames.length === 0}
              className="rounded-lg border border-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-500 transition hover:border-violet-700 hover:text-violet-400 disabled:opacity-40"
            >
              ↺ Reroll
            </button>
          )}
          <button
            role="switch"
            aria-checked={randomEnabled}
            onClick={() => {
              const next = !randomEnabled;
              setRandomEnabled(next);
              sessionStorage.setItem(STORAGE_KEY, String(next));
              if (next) void randomizeBattle();
            }}
            className={`relative h-6 w-11 rounded-full transition-colors duration-200 ${
              randomEnabled ? "bg-violet-600" : "bg-zinc-800"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                randomEnabled ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Pokemon pickers — side by side with VS divider */}
      <div className="relative grid grid-cols-2 gap-3">
        <PokemonPicker
          label="Attacker"
          value={attacker}
          onPick={p => { setAttacker(p); setResult(null); }}
          onClear={() => { setAttacker(null); setResult(null); }}
          inputRef={attackerInputRef}
        />

        {/* VS badge — centered between pickers */}
        <div className="pointer-events-none absolute top-1/2 left-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-700 bg-zinc-950 text-xs font-black tracking-tight text-zinc-500 shadow-lg">
            vs
          </div>
        </div>

        <PokemonPicker
          label="Defender"
          value={defender}
          onPick={p => { setDefender(p); setResult(null); }}
          onClear={() => { setDefender(null); setResult(null); }}
          inputRef={defenderInputRef}
        />
      </div>

      {/* Move section — visually separated */}
      <div className="flex flex-col gap-2 rounded-2xl border border-zinc-800/60 bg-zinc-900/30 p-4">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-zinc-600">Move</span>
          {moveData && (
            <div className="flex items-center gap-2 ml-auto">
              <span className="font-medium capitalize text-sm text-zinc-300">{moveData.name.replace(/-/g, " ")}</span>
              <TypeBadge type={moveData.type as PokemonType} size="sm" />
              <span className="text-xs text-zinc-600">{moveData.category} · Pwr {moveData.power ?? "—"}</span>
            </div>
          )}
        </div>
        <form
          onSubmit={e => { e.preventDefault(); setMoveSubmitted(moveQuery.trim()); setResult(null); }}
          className="flex gap-2"
        >
          <input
            ref={moveInputRef}
            value={moveQuery}
            onChange={e => setMoveQuery(e.target.value)}
            placeholder="flamethrower, earthquake…"
            className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-600 outline-none transition focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30"
          />
          <button
            type="submit"
            disabled={!moveQuery || moveFetching}
            className="rounded-xl bg-violet-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-violet-500 disabled:opacity-50"
          >
            {moveFetching ? "…" : "Load"}
          </button>
        </form>
        {moveError && <p className="text-xs text-red-400">{moveError.message}</p>}
      </div>

      {/* Calculate button */}
      <button
        type="button"
        onClick={calculate}
        disabled={!attacker || !defender || !moveData}
        className="w-full rounded-xl bg-violet-600 py-3 font-semibold text-white shadow-lg shadow-violet-900/30 transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
      >
        Calculate Damage
        <span className="ml-2 text-xs font-normal opacity-50">↵ Enter</span>
      </button>

      {/* Hotkey legend */}
      <div className="flex justify-center gap-6 text-xs text-zinc-700">
        <span><kbd className="rounded bg-zinc-900 px-1.5 py-0.5 font-mono text-zinc-600">↵</kbd> Calculate</span>
        <span><kbd className="rounded bg-zinc-900 px-1.5 py-0.5 font-mono text-zinc-600">Ctrl K</kbd> Focus search</span>
        <span><kbd className="rounded bg-zinc-900 px-1.5 py-0.5 font-mono text-zinc-600">↺</kbd> Reroll</span>
      </div>

      {result && attacker && defender && (
        <DamageResultCard
          result={result.dmg}
          moveName={result.move.name}
          attackerName={attacker.name}
          defenderName={defender.name}
          defenderBaseHp={defender.baseStats.hp}
        />
      )}
    </div>
  );
}
