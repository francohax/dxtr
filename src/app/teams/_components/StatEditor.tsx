"use client";

import type { StatSet } from "~/lib/types";

const STAT_KEYS: (keyof StatSet)[] = ["hp", "attack", "defense", "spAttack", "spDefense", "speed"];
const STAT_LABELS: Record<keyof StatSet, string> = {
  hp: "HP", attack: "Atk", defense: "Def",
  spAttack: "SpA", spDefense: "SpD", speed: "Spe",
};
const STAT_COLORS: Record<keyof StatSet, string> = {
  hp: "#f87171", attack: "#fb923c", defense: "#facc15",
  spAttack: "#60a5fa", spDefense: "#4ade80", speed: "#f472b6",
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
  const remaining = 510 - totalEvs;
  const budgetPct = Math.round((totalEvs / 510) * 100);
  const budgetColor = totalEvs > 490 ? "#f87171" : totalEvs > 400 ? "#fb923c" : "#8b5cf6";

  function setEv(stat: keyof StatSet, raw: number) {
    const otherTotal = (Object.entries(evs) as [keyof StatSet, number][])
      .filter(([k]) => k !== stat)
      .reduce((sum, [, v]) => sum + v, 0);
    onEvsChange({ ...evs, [stat]: Math.min(raw, 510 - otherTotal, 252) });
  }

  function setIv(stat: keyof StatSet, raw: string) {
    onIvsChange({ ...ivs, [stat]: Math.min(31, Math.max(0, parseInt(raw) || 0)) });
  }

  return (
    <div className="flex flex-col gap-2">

      {/* Column headers */}
      <div className="flex items-center gap-2">
        <div className="w-7 shrink-0" />
        <div className="flex flex-1 items-center justify-between">
          <span className="section-label">EVs</span>
          <label className="flex cursor-pointer items-center gap-1.5 text-[10px] text-zinc-500 select-none">
            <span>IVs</span>
            <button
              type="button"
              role="switch"
              aria-checked={ivsEnabled}
              onClick={() => onIvsToggle(!ivsEnabled)}
              className={`relative h-3.5 w-7 rounded-full transition-colors duration-200 ${ivsEnabled ? "bg-violet-600" : "bg-zinc-700 hover:bg-zinc-600"}`}
            >
              <span className={`absolute top-0.5 left-0.5 h-2.5 w-2.5 rounded-full bg-white shadow-sm transition-transform duration-200 ${ivsEnabled ? "translate-x-3" : "translate-x-0"}`} />
            </button>
          </label>
        </div>
        <div className="w-10 shrink-0" />
        <div
          className={`shrink-0 overflow-hidden transition-all duration-200 ease-out ${ivsEnabled ? "w-10 opacity-100" : "w-0 opacity-0"}`}
        >
          <span className="section-label block w-10 text-center text-violet-400/70">IV</span>
        </div>
      </div>

      {/* Stat rows */}
      <div className="space-y-1.5">
        {STAT_KEYS.map(stat => {
          const color = STAT_COLORS[stat];
          const evValue = evs[stat];
          const cappedMax = Math.min(252, evValue + remaining);
          const fillPct = Math.round((evValue / 252) * 100);

          return (
            <div key={stat} className="flex items-center gap-2">
              {/* Stat label */}
              <span className="w-7 shrink-0 text-right text-[10px] font-mono text-zinc-500">
                {STAT_LABELS[stat]}
              </span>

              {/* EV slider */}
              <input
                type="range"
                min={0}
                max={252}
                value={evValue}
                onChange={e => setEv(stat, Math.min(parseInt(e.target.value), cappedMax))}
                className="ev-slider flex-1"
                style={{
                  "--slider-color": color,
                  background: `linear-gradient(to right, ${color} 0%, ${color} ${fillPct}%, rgb(39 39 42) ${fillPct}%, rgb(39 39 42) 100%)`,
                } as React.CSSProperties}
              />

              {/* EV number input */}
              <input
                type="number"
                min={0}
                max={252}
                value={evValue}
                onChange={e => {
                  const v = parseInt(e.target.value);
                  if (!isNaN(v)) setEv(stat, Math.max(0, v));
                }}
                className="w-10 shrink-0 rounded-lg border border-zinc-700 bg-zinc-950 px-1 py-0.5 text-center text-xs text-white outline-none focus:border-violet-500 [appearance:textfield]"
              />

              {/* IV number input — slides in from the right */}
              <div
                className={`shrink-0 overflow-hidden transition-all duration-200 ease-out ${ivsEnabled ? "w-10 opacity-100" : "w-0 opacity-0"}`}
              >
                <input
                  type="number"
                  min={0}
                  max={31}
                  value={ivs[stat]}
                  onChange={e => setIv(stat, e.target.value)}
                  tabIndex={ivsEnabled ? 0 : -1}
                  className="w-10 rounded-lg border border-violet-800/50 bg-violet-950/30 px-1 py-0.5 text-center text-xs text-violet-300 outline-none focus:border-violet-500 [appearance:textfield]"
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* EV budget bar */}
      <div className="space-y-1 pt-0.5">
        <div className="flex justify-between text-[10px] text-zinc-600">
          <span>{totalEvs} / 510 EVs</span>
          <span>{remaining} left</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${budgetPct}%`, background: budgetColor }}
          />
        </div>
      </div>

    </div>
  );
}
