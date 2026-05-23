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

function PokemonPicker({
  label,
  value,
  onPick,
  onClear,
  inputRef,
}: PokemonPickerProps) {
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");

  const { data, isFetching, error } = api.pokemon.search.useQuery(
    { query: submitted },
    { enabled: !!submitted, retry: false }
  );

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-zinc-400">{label}</label>
      {value ? (
        <div className="flex items-center gap-3 rounded-xl border border-zinc-700 bg-zinc-900 p-3">
          <Image src={value.sprite} alt={value.name} width={48} height={48} unoptimized />
          <div>
            <p className="text-sm font-semibold capitalize">{value.name}</p>
            <div className="flex gap-1">
              {value.types.map(t => <TypeBadge key={t} type={t as PokemonType} size="sm" />)}
            </div>
          </div>
          <button
            onClick={() => { setSubmitted(""); setQuery(""); onClear(); }}
            className="ml-auto text-xs text-zinc-600 hover:text-white"
          >
            Change
          </button>
        </div>
      ) : (
        <form onSubmit={e => { e.preventDefault(); setSubmitted(query.trim()); }} className="flex gap-2">
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Pokemon name…"
            className="flex-1 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-violet-500"
          />
          <button
            type="submit"
            disabled={!query || isFetching}
            className="rounded-xl bg-violet-600 px-3 py-2 text-sm text-white hover:bg-violet-500 disabled:opacity-50"
          >
            {isFetching ? "…" : "Find"}
          </button>
        </form>
      )}
      {error && <p className="text-xs text-red-400">{error.message}</p>}
      {data && !value && (
        <button
          onClick={() => onPick(data)}
          className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-left text-sm capitalize transition hover:border-violet-600"
        >
          Use <span className="font-semibold">{data.name}</span>
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
    <div className="flex flex-col gap-6">
      {/* Random scenario toggle */}
      <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium text-zinc-200">Random Battle</span>
          <span className="text-xs text-zinc-500">
            {randomEnabled ? "Auto-loads a random matchup" : "Manual input mode"}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {randomEnabled && (
            <button
              onClick={() => void randomizeBattle()}
              disabled={allNames.length === 0}
              className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-400 transition hover:border-violet-600 hover:text-violet-400 disabled:opacity-40"
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
            className={`relative h-6 w-11 rounded-full transition-colors ${
              randomEnabled ? "bg-violet-600" : "bg-zinc-700"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                randomEnabled ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <PokemonPicker
          label="Attacker"
          value={attacker}
          onPick={p => { setAttacker(p); setResult(null); }}
          onClear={() => { setAttacker(null); setResult(null); }}
          inputRef={attackerInputRef}
        />
        <PokemonPicker
          label="Defender"
          value={defender}
          onPick={p => { setDefender(p); setResult(null); }}
          onClear={() => { setDefender(null); setResult(null); }}
          inputRef={defenderInputRef}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-zinc-400">Move</label>
        <form
          onSubmit={e => { e.preventDefault(); setMoveSubmitted(moveQuery.trim()); setResult(null); }}
          className="flex gap-2"
        >
          <input
            ref={moveInputRef}
            value={moveQuery}
            onChange={e => setMoveQuery(e.target.value)}
            placeholder="flamethrower, earthquake…"
            className="flex-1 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-violet-500"
          />
          <button
            type="submit"
            disabled={!moveQuery || moveFetching}
            className="rounded-xl bg-violet-600 px-3 py-2 text-sm text-white hover:bg-violet-500 disabled:opacity-50"
          >
            {moveFetching ? "…" : "Load"}
          </button>
        </form>
        {moveError && <p className="text-xs text-red-400">{moveError.message}</p>}
        {moveData && (
          <div className="flex items-center gap-3 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm">
            <span className="font-medium capitalize">{moveData.name.replace(/-/g, " ")}</span>
            <TypeBadge type={moveData.type as PokemonType} size="sm" />
            <span className="text-zinc-500">{moveData.category} · Pwr {moveData.power ?? "—"}</span>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={calculate}
        disabled={!attacker || !defender || !moveData}
        className="w-full rounded-xl bg-violet-600 py-3 font-semibold text-white transition hover:bg-violet-500 disabled:opacity-40"
      >
        Calculate Damage
        <span className="ml-2 text-xs font-normal opacity-60">↵ Enter</span>
      </button>

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
