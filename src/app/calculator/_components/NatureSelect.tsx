"use client";

import { type NatureKey, NATURE_KEYS, getNatureModifiedStats } from "~/lib/natures";

interface NatureSelectProps {
  value: NatureKey;
  onChange: (nature: NatureKey) => void;
  containerRef?: React.RefObject<HTMLSelectElement | null>;
}

const STAT_LABEL: Record<string, string> = {
  attack:    "Atk",
  defense:   "Def",
  spAttack:  "SpA",
  spDefense: "SpD",
  speed:     "Spe",
};

export function NatureSelect({ value, onChange, containerRef }: NatureSelectProps) {
  const { boosted, lowered } = getNatureModifiedStats(value);

  return (
    <div className="flex items-center gap-1.5">
      <select
        ref={containerRef}
        value={value}
        onChange={e => onChange(e.target.value as NatureKey)}
        className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-xs text-white outline-none transition focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 capitalize"
      >
        {NATURE_KEYS.map(n => (
          <option key={n} value={n} className="capitalize">
            {n.charAt(0).toUpperCase() + n.slice(1)}
          </option>
        ))}
      </select>
      <div className="flex shrink-0 flex-col text-[9px] font-semibold leading-tight">
        {boosted ? (
          <span className="text-green-400">+{STAT_LABEL[boosted]}</span>
        ) : (
          <span className="text-zinc-700">—</span>
        )}
        {lowered && <span className="text-red-400">−{STAT_LABEL[lowered]}</span>}
      </div>
    </div>
  );
}
