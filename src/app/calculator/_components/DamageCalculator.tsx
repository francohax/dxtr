"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { api } from "~/trpc/react";
import { calculateDamage, getTypeEffectiveness } from "~/lib/damage";
import { type DamageResult } from "~/lib/damage";
import { type PokemonSummary, type MoveDetail, type PokemonType, type BattleConfig, DEFAULT_BATTLE_CONFIG } from "~/lib/types";
import { DamageResultCard } from "./DamageResult";
import { TypeBadge } from "~/app/_components/TypeBadge";
import { PokemonPickerModal } from "./PokemonPickerModal";
import { MoveFuzzySearch } from "./MoveFuzzySearch";
import { BattleConfigPanel } from "./BattleConfigPanel";
import { useKeyboardShortcuts } from "~/hooks/useKeyboardShortcuts";

const STORAGE_KEY = "dxtr-random-battle";

// ─── Pokemon slot card ────────────────────────────────────────────────────────

interface PokemonSlotCardProps {
  label: string;
  value: PokemonSummary | null;
  onOpenPicker: () => void;
}

function PokemonSlotCard({ label, value, onOpenPicker }: PokemonSlotCardProps) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[11px] font-semibold uppercase tracking-widest text-zinc-600">{label}</span>
      {value ? (
        <div
          role="button"
          tabIndex={0}
          onClick={onOpenPicker}
          onKeyDown={e => { if (e.key === "Enter" || e.key === " ") onOpenPicker(); }}
          className="group relative flex cursor-pointer flex-col items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900 p-4 transition hover:border-zinc-700"
        >
          <div className="relative flex h-20 w-20 items-center justify-center rounded-xl bg-zinc-800/80">
            <Image src={value.sprite} alt={value.name} width={72} height={72} unoptimized className="drop-shadow-lg" />
          </div>
          <div className="flex flex-col items-center gap-1">
            <p className="text-sm font-bold capitalize tracking-tight text-white">{value.name}</p>
            <div className="flex gap-1">
              {value.types.map(t => <TypeBadge key={t} type={t as PokemonType} size="sm" />)}
            </div>
          </div>
          {/* Change hint on hover */}
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-center rounded-b-2xl bg-zinc-800/0 py-1.5 opacity-0 transition group-hover:bg-zinc-800/60 group-hover:opacity-100">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Change</span>
          </div>
        </div>
      ) : (
        <button
          onClick={onOpenPicker}
          className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/50 py-5 transition hover:border-violet-600/60 hover:bg-violet-950/10"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-dashed border-zinc-700 text-zinc-700">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="8" r="5" />
              <path d="M3 21v-1a9 9 0 0 1 18 0v1" />
            </svg>
          </div>
          <span className="text-xs text-zinc-600">Select {label}…</span>
        </button>
      )}
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export function DamageCalculator() {
  const [attacker, setAttacker] = useState<PokemonSummary | null>(null);
  const [defender, setDefender] = useState<PokemonSummary | null>(null);
  const [move, setMove] = useState<MoveDetail | null>(null);
  const [result, setResult] = useState<{ dmg: DamageResult; move: MoveDetail } | null>(null);
  const [battleConfig, setBattleConfig] = useState<BattleConfig>(DEFAULT_BATTLE_CONFIG);

  const [attackerModalOpen, setAttackerModalOpen] = useState(false);
  const [defenderModalOpen, setDefenderModalOpen] = useState(false);

  const [randomEnabled, setRandomEnabled] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const stored = sessionStorage.getItem(STORAGE_KEY);
    return stored === null ? true : stored === "true";
  });

  const { data: allNames = [] } = api.pokemon.listNames.useQuery(undefined, { staleTime: Infinity });
  const utils = api.useUtils();

  const moveInputRef = useRef<HTMLInputElement>(null);

  function calculate() {
    if (!attacker || !defender || !move) return;
    const isPhysical = move.category === "physical";
    const attackStat  = isPhysical ? attacker.baseStats.attack  : attacker.baseStats.spAttack;
    const defenseStat = isPhysical ? defender.baseStats.defense : defender.baseStats.spDefense;
    const stab = attacker.types.includes(move.type as PokemonType);
    const te   = getTypeEffectiveness(move.type as PokemonType, defender.types as PokemonType[]);
    const dmg  = calculateDamage({
      level: battleConfig.level,
      power: move.power ?? 0,
      attackStat,
      defenseStat,
      stab,
      typeEffectiveness: te,
      moveType: move.type as PokemonType,
      weather: battleConfig.weather,
      terrain: battleConfig.terrain,
      isCritical: battleConfig.isCritical,
    });
    setResult({ dmg, move });
  }

  const randomizeBattle = useCallback(async () => {
    if (allNames.length === 0) return;

    const pick = () => allNames[Math.floor(Math.random() * allNames.length)]!;
    const attName = pick();
    let defName = pick();
    while (defName === attName && allNames.length > 1) defName = pick();

    setResult(null);
    setMove(null);

    const [att, def] = await Promise.all([
      utils.pokemon.search.fetch({ query: attName }),
      utils.pokemon.search.fetch({ query: defName }),
    ]);
    setAttacker(att);
    setDefender(def);

    const candidates = [...att.moveNames].sort(() => Math.random() - 0.5);
    for (const moveName of candidates.slice(0, 10)) {
      try {
        const moveData = await utils.pokemon.getMove.fetch({ moveName });
        if (moveData.power !== null && moveData.power > 0 && moveData.category !== "status") {
          setMove(moveData);
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
      if (attacker && defender && move) calculate();
    },
    onSearch: () => {
      if (!attacker) {
        setAttackerModalOpen(true);
      } else if (!defender) {
        setDefenderModalOpen(true);
      } else {
        moveInputRef.current?.focus();
      }
    },
  });

  return (
    <div className="flex flex-col gap-5">

      {/* Random battle toggle */}
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

      {/* Pokemon pickers */}
      <div className="relative grid grid-cols-2 gap-3">
        <PokemonSlotCard
          label="Attacker"
          value={attacker}
          onOpenPicker={() => setAttackerModalOpen(true)}
        />

        {/* VS badge */}
        <div className="pointer-events-none absolute top-1/2 left-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-700 bg-zinc-950 text-xs font-black tracking-tight text-zinc-500 shadow-lg">
            vs
          </div>
        </div>

        <PokemonSlotCard
          label="Defender"
          value={defender}
          onOpenPicker={() => setDefenderModalOpen(true)}
        />
      </div>

      {/* Move section */}
      <div className="flex flex-col gap-2 rounded-2xl border border-zinc-800/60 bg-zinc-900/30 p-4">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-zinc-600">Move</span>
        <MoveFuzzySearch
          moveNames={attacker?.moveNames ?? []}
          value={move}
          onSelect={m => { setMove(m); setResult(null); }}
          onClear={() => { setMove(null); setResult(null); }}
          inputRef={moveInputRef}
        />
      </div>

      {/* Battle config */}
      <BattleConfigPanel
        config={battleConfig}
        onChange={c => { setBattleConfig(c); setResult(null); }}
      />

      {/* Calculate */}
      <button
        type="button"
        onClick={calculate}
        disabled={!attacker || !defender || !move}
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

      {/* Result */}
      {result && attacker && defender && (
        <DamageResultCard
          result={result.dmg}
          moveName={result.move.name}
          attackerName={attacker.name}
          defenderName={defender.name}
          defenderBaseHp={defender.baseStats.hp}
        />
      )}

      {/* Modals */}
      {attackerModalOpen && (
        <PokemonPickerModal
          label="Attacker"
          current={attacker}
          onSelect={p => { setAttacker(p); setMove(null); setResult(null); setAttackerModalOpen(false); }}
          onClose={() => setAttackerModalOpen(false)}
        />
      )}
      {defenderModalOpen && (
        <PokemonPickerModal
          label="Defender"
          current={defender}
          onSelect={p => { setDefender(p); setResult(null); setDefenderModalOpen(false); }}
          onClose={() => setDefenderModalOpen(false)}
        />
      )}
    </div>
  );
}
