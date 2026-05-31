"use client";

import { type NatureKey, NATURE_KEYS, getNatureModifiedStats } from "~/lib/natures";
import { Tooltip } from "./Tooltip";

interface NatureSelectProps {
  value: NatureKey;
  onChange: (nature: NatureKey) => void;
  containerRef?: React.RefObject<HTMLSelectElement | null>;
}

const STAT_LABEL: Record<string, string> = {
  attack:    "Attack",
  defense:   "Defense",
  spAttack:  "Sp. Atk",
  spDefense: "Sp. Def",
  speed:     "Speed",
};

const STAT_SHORT: Record<string, string> = {
  attack:    "Atk",
  defense:   "Def",
  spAttack:  "SpA",
  spDefense: "SpD",
  speed:     "Spe",
};

function natureTooltip(nature: NatureKey) {
  const { boosted, lowered } = getNatureModifiedStats(nature);
  const isNeutral = !boosted && !lowered;
  return (
    <div className="flex flex-col gap-1">
      <span className="font-semibold capitalize text-zinc-100">{nature}</span>
      {isNeutral ? (
        <span className="text-zinc-500">No stat changes (neutral nature)</span>
      ) : (
        <>
          {boosted && (
            <span>
              {STAT_LABEL[boosted]} <span className="font-medium text-green-300">×1.1 (+10%)</span>
            </span>
          )}
          {lowered && (
            <span>
              {STAT_LABEL[lowered]} <span className="font-medium text-red-400">×0.9 (−10%)</span>
            </span>
          )}
        </>
      )}
      <span className="mt-0.5 text-zinc-500 text-[10px]">Natures affect all stats except HP.</span>
    </div>
  );
}

export function NatureSelect({ value, onChange, containerRef }: NatureSelectProps) {
  const { boosted, lowered } = getNatureModifiedStats(value);

  return (
    <div className="flex items-center gap-1.5">
      <Tooltip content={natureTooltip(value)} side="top" className="flex-1">
        <select
          ref={containerRef}
          value={value}
          onChange={e => onChange(e.target.value as NatureKey)}
          className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-xs text-white outline-none transition focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 capitalize"
        >
          {NATURE_KEYS.map(n => (
            <option key={n} value={n} className="capitalize">
              {n.charAt(0).toUpperCase() + n.slice(1)}
            </option>
          ))}
        </select>
      </Tooltip>
      <div className="flex shrink-0 flex-col text-[9px] font-semibold leading-tight">
        {boosted ? (
          <span className="text-green-400">+{STAT_SHORT[boosted]}</span>
        ) : (
          <span className="text-zinc-700">—</span>
        )}
        {lowered && <span className="text-red-400">−{STAT_SHORT[lowered]}</span>}
      </div>
    </div>
  );
}
