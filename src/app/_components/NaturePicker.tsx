"use client";

import { useState, useRef, useEffect } from "react";
import { NATURES } from "~/lib/natures";
import type { StatKey } from "~/lib/natures";

const GRID_STATS: { key: StatKey; short: string }[] = [
  { key: "attack",    short: "Atk" },
  { key: "defense",   short: "Def" },
  { key: "spAttack",  short: "SpA" },
  { key: "spDefense", short: "SpD" },
  { key: "speed",     short: "Spe" },
];

const NEUTRAL_NATURES = ["hardy", "docile", "serious", "bashful", "quirky"];

function findNature(boost: StatKey, reduce: StatKey): string | null {
  return (
    Object.entries(NATURES).find(
      ([, n]) => n.boost === boost && n.reduce === reduce
    )?.[0] ?? null
  );
}

const STAT_SHORT: Record<StatKey, string> = {
  hp: "HP", attack: "Atk", defense: "Def",
  spAttack: "SpA", spDefense: "SpD", speed: "Spe",
};

interface NaturePickerProps {
  value: string;
  onChange: (nature: string) => void;
  className?: string;
  buttonRef?: React.RefObject<HTMLButtonElement | null>;
}

export function NaturePicker({ value, onChange, className = "", buttonRef }: NaturePickerProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open]);

  const nat = NATURES[value];
  const boosted = nat?.boost ?? null;
  const lowered = nat?.reduce ?? null;
  const isNeutral = !boosted && !lowered;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen(v => !v)}
        className="h-12 w-full flex items-center justify-around gap-2.5 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm transition-all hover:border-violet-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
      >
        <span className="min-w-[5ch] capitalize font-semibold">{value}</span>
        <div className="flex flex-col items-end gap-px text-[9px] font-bold leading-none">
          {boosted ? (
            <span className="text-red-400">+{STAT_SHORT[boosted]}</span>
          ) : (
            <span className="text-zinc-600">
              {isNeutral ? "neutral" : "+?"}
            </span>
          )}
          {lowered && (
            <span className="text-blue-400">−{STAT_SHORT[lowered]}</span>
          )}
        </div>
        <svg
          className={`h-3 w-3 shrink-0 text-zinc-500 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
          viewBox="0 0 12 12"
          fill="none"
        >
          <path
            d="M2 4l4 4 4-4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* Popover */}
      {open && (
        <div className="animate-scale-in absolute right-0 top-full z-50 mt-2 rounded-2xl border border-zinc-700/80 bg-zinc-950 p-4 shadow-2xl shadow-black/60">
          {/* Column headers (raised stat) */}
          <div className="mb-1.5 grid grid-cols-[3.5rem_repeat(5,2.6rem)] gap-1 text-center">
            <div />
            {GRID_STATS.map(s => (
              <div key={s.key} className="text-[10px] font-bold text-red-400">
                +{s.short}
              </div>
            ))}
          </div>

          {/* Grid rows (cut stat) */}
          {GRID_STATS.map(rowStat => (
            <div key={rowStat.key} className="mb-1 grid grid-cols-[3.5rem_repeat(5,2.6rem)] gap-1 items-center">
              <div className="text-right pr-2 text-[10px] font-bold text-blue-400">
                −{rowStat.short}
              </div>
              {GRID_STATS.map(colStat => {
                const isDiagonal = colStat.key === rowStat.key;
                const natureName = isDiagonal
                  ? null
                  : findNature(colStat.key, rowStat.key);
                const isSelected = natureName === value;

                return (
                  <button
                    key={colStat.key}
                    type="button"
                    disabled={isDiagonal}
                    onClick={() => {
                      if (natureName) {
                        onChange(natureName);
                        setOpen(false);
                      }
                    }}
                    className={`h-8 rounded-lg text-[10px] font-semibold capitalize transition-all focus:outline-none ${
                      isDiagonal
                        ? "cursor-default bg-zinc-800/30 text-zinc-700"
                        : isSelected
                        ? "bg-violet-600 text-white shadow-sm shadow-violet-900/60 ring-1 ring-violet-400/40"
                        : "bg-zinc-800/70 text-zinc-300 hover:bg-zinc-700 hover:text-white focus-visible:ring-2 focus-visible:ring-violet-500"
                    }`}
                  >
                    {isDiagonal ? "—" : natureName}
                  </button>
                );
              })}
            </div>
          ))}

          {/* Neutral natures */}
          <div className="mt-3 border-t border-zinc-800 pt-3">
            <p className="mb-1.5 section-label">Neutral</p>
            <div className="flex gap-1 flex-wrap">
              {NEUTRAL_NATURES.map(name => (
                <button
                  key={name}
                  type="button"
                  onClick={() => { onChange(name); setOpen(false); }}
                  className={`rounded-lg px-2.5 py-1 text-[10px] font-semibold capitalize transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
                    value === name
                      ? "bg-violet-600 text-white shadow-sm shadow-violet-900/60"
                      : "bg-zinc-800/70 text-zinc-400 hover:bg-zinc-700 hover:text-white"
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
