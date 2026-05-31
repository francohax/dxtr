"use client";

import type { StatSet } from "~/lib/types";

const STAT_KEYS: (keyof StatSet)[] = ["hp", "attack", "defense", "spAttack", "spDefense", "speed"];
const STAT_LABELS: Record<keyof StatSet, string> = {
  hp: "HP", attack: "Atk", defense: "Def",
  spAttack: "SpA", spDefense: "SpD", speed: "Spe",
};

interface StatEditorProps {
  evs: StatSet;
  ivs: StatSet;
  ivsEnabled: boolean;
  onEvsChange: (evs: StatSet) => void;
  onIvsChange: (ivs: StatSet) => void;
  onIvsToggle: (enabled: boolean) => void;
}

export function StatEditor({ evs, ivs, ivsEnabled, onEvsChange, onIvsChange, onIvsToggle }: StatEditorProps) {
  const totalEvs = (Object.values(evs) as number[]).reduce((a, b) => a + b, 0);

  function setEv(stat: keyof StatSet, raw: string) {
    const val = Math.min(252, Math.max(0, parseInt(raw) || 0));
    const otherTotal = (Object.entries(evs) as [keyof StatSet, number][])
      .filter(([k]) => k !== stat)
      .reduce((sum, [, v]) => sum + v, 0);
    onEvsChange({ ...evs, [stat]: Math.min(val, 510 - otherTotal) });
  }

  function setIv(stat: keyof StatSet, raw: string) {
    onIvsChange({ ...ivs, [stat]: Math.min(31, Math.max(0, parseInt(raw) || 0)) });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-zinc-400">
          EVs <span className="text-zinc-600">({totalEvs}/510)</span>
        </span>
        <label className="flex cursor-pointer items-center gap-1.5 text-xs text-zinc-400">
          <input
            type="checkbox"
            checked={ivsEnabled}
            onChange={e => onIvsToggle(e.target.checked)}
            className="accent-violet-500"
          />
          Show IVs
        </label>
      </div>
      {ivsEnabled && (
        <div className={`grid gap-2 text-xs text-zinc-500 ${ivsEnabled ? "grid-cols-[3rem_1fr_1fr]" : "grid-cols-[3rem_1fr]"}`}>
          <span />
          <span className="text-center">EV</span>
          <span className="text-center">IV</span>
        </div>
      )}
      <div className="grid gap-1.5">
        {STAT_KEYS.map(stat => (
          <div
            key={stat}
            className={`grid items-center gap-2 ${ivsEnabled ? "grid-cols-[3rem_1fr_1fr]" : "grid-cols-[3rem_1fr]"}`}
          >
            <span className="text-xs text-zinc-500">{STAT_LABELS[stat]}</span>
            <input
              type="number"
              min={0}
              max={252}
              value={evs[stat]}
              onChange={e => setEv(stat, e.target.value)}
              className="w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-0.5 text-xs text-white outline-none focus:border-violet-500 [appearance:textfield]"
            />
            {ivsEnabled && (
              <input
                type="number"
                min={0}
                max={31}
                value={ivs[stat]}
                onChange={e => setIv(stat, e.target.value)}
                className="w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-0.5 text-xs text-zinc-300 outline-none focus:border-violet-500 [appearance:textfield]"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
