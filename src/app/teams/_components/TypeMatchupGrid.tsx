"use client";

import { getPokemonTypeMatchups } from "~/lib/coverage";
import { TypeBadge } from "~/app/_components/TypeBadge";
import { type PokemonType } from "~/lib/types";

interface TypeMatchupGridProps {
  defenderTypes: PokemonType[];
}

const BUCKETS: { multiplier: number; label: string; className: string }[] = [
  { multiplier: 4,    label: "4× Weak",  className: "text-red-400"    },
  { multiplier: 2,    label: "2× Weak",  className: "text-orange-400" },
  { multiplier: 0.5,  label: "½ Resist", className: "text-emerald-400" },
  { multiplier: 0.25, label: "¼ Resist", className: "text-teal-400"   },
  { multiplier: 0,    label: "Immune",   className: "text-zinc-400"   },
];

export function TypeMatchupGrid({ defenderTypes }: TypeMatchupGridProps) {
  const matchups = getPokemonTypeMatchups(defenderTypes);

  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-zinc-500">
        Type Matchups
      </p>
      <div className="space-y-2">
        {BUCKETS.map(({ multiplier, label, className }) => {
          const types = matchups
            .filter(m => m.multiplier === multiplier)
            .map(m => m.attackType);
          if (types.length === 0) return null;
          return (
            <div key={multiplier} className="flex items-start gap-2">
              <span className={`w-20 shrink-0 text-right text-xs font-semibold ${className}`}>
                {label}
              </span>
              <div className="flex flex-wrap gap-1">
                {types.map(t => <TypeBadge key={t} type={t} />)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
