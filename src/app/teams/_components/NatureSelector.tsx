"use client";

import { NATURE_NAMES, NATURES } from "~/lib/natures";
import type { StatKey } from "~/lib/natures";

const STAT_ABBR: Record<StatKey, string> = {
  hp: "HP", attack: "Atk", defense: "Def",
  spAttack: "SpA", spDefense: "SpD", speed: "Spe",
};

interface NatureSelectorProps {
  value: string;
  onChange: (nature: string) => void;
}

export function NatureSelector({ value, onChange }: NatureSelectorProps) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-zinc-400">Nature</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm capitalize text-white outline-none focus:border-violet-500"
      >
        {NATURE_NAMES.map(name => {
          const n = NATURES[name]!;
          const label = n.boost
            ? `${name} (+${STAT_ABBR[n.boost]} −${STAT_ABBR[n.reduce!]})`
            : `${name} (neutral)`;
          return (
            <option key={name} value={name}>{label}</option>
          );
        })}
      </select>
    </div>
  );
}
