"use client";

import { calcStat, getNatureMultiplier, type StatKey } from "~/lib/natures";
import { type PokemonSummary, type StatSet } from "~/lib/types";

const STAT_ROWS: { statKey: StatKey; label: string }[] = [
  { statKey: "hp",        label: "HP"  },
  { statKey: "attack",    label: "Atk" },
  { statKey: "defense",   label: "Def" },
  { statKey: "spAttack",  label: "SpA" },
  { statKey: "spDefense", label: "SpD" },
  { statKey: "speed",     label: "Spe" },
];

interface ComputedStatsTableProps {
  pokemon: PokemonSummary;
  nature: string;
  evs: StatSet;
  ivs: StatSet;
  ivsEnabled: boolean;
  level?: number;
}

export function ComputedStatsTable({
  pokemon,
  nature,
  evs,
  ivs,
  ivsEnabled,
  level = 50,
}: ComputedStatsTableProps) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-zinc-500">
        Computed Stats <span className="font-normal normal-case text-zinc-600">Lv. {level}</span>
      </p>
      <div className="space-y-1.5">
        {STAT_ROWS.map(({ statKey, label }) => {
          const base = pokemon.baseStats[statKey];
          const iv = ivsEnabled ? ivs[statKey] : 31;
          const ev = evs[statKey];
          const final = calcStat({ base, iv, ev, level, nature, stat: statKey });
          const mult = getNatureMultiplier(nature, statKey);
          const isBoost = mult > 1;
          const isReduce = mult < 1;

          return (
            <div key={statKey} className="flex items-center gap-2 text-sm">
              <span className="w-7 shrink-0 text-right text-xs font-mono text-zinc-500">
                {label}
              </span>
              <span className="w-8 shrink-0 text-right tabular-nums text-zinc-500">{base}</span>
              <svg className="h-3 w-3 shrink-0 text-zinc-700" viewBox="0 0 12 12">
                <path d="M2 6h8M7 3l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span
                className={`w-10 shrink-0 text-right font-semibold tabular-nums ${
                  isBoost ? "text-red-400" : isReduce ? "text-blue-400" : "text-white"
                }`}
              >
                {final}
              </span>
              {(isBoost || isReduce) && (
                <span className={`text-xs ${isBoost ? "text-red-500" : "text-blue-500"}`}>
                  {isBoost ? "↑" : "↓"}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
