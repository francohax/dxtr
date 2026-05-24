"use client";

import Image from "next/image";
import { type RouterOutputs } from "~/trpc/react";
import { TypeBadge } from "~/app/_components/TypeBadge";
import { type PokemonType } from "~/lib/types";

type SavedCalc = RouterOutputs["calc"]["list"][number];

interface SavedCalcCardProps {
  calc: SavedCalc;
  onDelete: (id: number) => void;
  onLoad?: (calc: SavedCalc) => void;
}

function hpBarColor(pct: number): string {
  if (pct >= 100) return "bg-red-500";
  if (pct >= 50)  return "bg-amber-400";
  return "bg-green-500";
}

export function SavedCalcCard({ calc, onDelete, onLoad }: SavedCalcCardProps) {
  const avgPct = (calc.minPercent + calc.maxPercent) / 2;

  return (
    <div
      role={onLoad ? "button" : undefined}
      tabIndex={onLoad ? 0 : undefined}
      onClick={() => onLoad?.(calc)}
      onKeyDown={e => { if (onLoad && (e.key === "Enter" || e.key === " ")) onLoad(calc); }}
      className={`group relative rounded-xl border border-zinc-800/60 bg-zinc-900 p-3 transition ${
        onLoad ? "cursor-pointer hover:border-violet-500/40 hover:bg-zinc-800/60" : ""
      }`}
    >
      {/* Action buttons */}
      <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
        {onLoad && (
          <button
            onClick={e => { e.stopPropagation(); onLoad(calc); }}
            className="rounded p-0.5 text-zinc-600 transition hover:text-violet-400"
            aria-label="Load saved calc"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
          </button>
        )}
        <button
          onClick={e => { e.stopPropagation(); onDelete(calc.id); }}
          className="rounded p-0.5 text-zinc-700 transition hover:text-red-400"
          aria-label="Delete saved calc"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Pokemon row */}
      <div className="flex items-center gap-2 pr-12">
        <div className="flex items-center gap-1.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-800">
            <Image src={calc.attackerSprite} alt={calc.attackerName} width={24} height={24} unoptimized />
          </div>
          <span className="text-[11px] font-semibold capitalize text-zinc-300">
            {calc.attackerName.replace(/-/g, " ")}
          </span>
        </div>

        <span className="text-[10px] text-zinc-700">vs</span>

        <div className="flex items-center gap-1.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-800">
            <Image src={calc.defenderSprite} alt={calc.defenderName} width={24} height={24} unoptimized />
          </div>
          <span className="text-[11px] font-semibold capitalize text-zinc-300">
            {calc.defenderName.replace(/-/g, " ")}
          </span>
        </div>
      </div>

      {/* Move */}
      <div className="mt-2 flex items-center gap-1.5">
        <TypeBadge type={calc.moveType as PokemonType} size="sm" />
        <span className="text-[11px] capitalize text-zinc-400">
          {calc.moveName.replace(/-/g, " ")}
        </span>
        {calc.movePower != null && (
          <span className="ml-auto font-mono text-[10px] text-zinc-600">{calc.movePower} BP</span>
        )}
      </div>

      {/* HP bar */}
      <div className="mt-2">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
          <div
            className={`h-full rounded-full transition-all ${hpBarColor(avgPct)}`}
            style={{ width: `${Math.min(calc.maxPercent, 100)}%` }}
          />
        </div>
        <div className="mt-1 flex justify-between">
          <span className="text-[10px] text-zinc-600">Damage</span>
          <span className="font-mono text-[10px] text-zinc-400">
            {calc.minPercent.toFixed(1)}–{calc.maxPercent.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
}
