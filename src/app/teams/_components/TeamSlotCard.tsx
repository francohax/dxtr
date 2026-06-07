"use client";

import Image from "next/image";
import { TypeBadge } from "~/app/_components/TypeBadge";
import { type TeamSlotConfig } from "~/lib/types";

interface TeamSlotCardProps {
  slot: TeamSlotConfig | null;
  slotIndex: number;
  isActive: boolean;
  onSelect: () => void;
  onRemove: (e: React.MouseEvent) => void;
}

export function TeamSlotCard({ slot, slotIndex, isActive, onSelect, onRemove }: TeamSlotCardProps) {
  return (
    <button
      onClick={onSelect}
      className={`w-full rounded-r-xl border border-l-0 p-3 text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
        isActive
          ? "border-violet-500 bg-violet-950/40 shadow-sm shadow-violet-900/30"
          : "border-zinc-800 bg-zinc-900 hover:border-zinc-600 hover:bg-zinc-800/60"
      }`}
    >
      {slot ? (
        <div className="flex items-center gap-3">
          <Image
            src={slot.pokemon.sprite}
            alt={slot.pokemon.name}
            width={56}
            height={56}
            className="shrink-0 drop-shadow-sm"
            unoptimized
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold capitalize leading-tight">
              {slot.pokemon.name}
            </p>
            <div className="mt-1 flex flex-wrap gap-1">
              {slot.pokemon.types.map(t => (
                <TypeBadge key={t} type={t} />
              ))}
            </div>
          </div>
          <button
            onClick={onRemove}
            aria-label={`Remove ${slot.pokemon.name}`}
            className="ml-1 shrink-0 rounded-full p-1 text-zinc-600 transition hover:bg-zinc-700 hover:text-red-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 14 14" fill="none">
              <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-3 text-zinc-500">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-dashed border-zinc-700 text-zinc-600">
            <span className="text-lg font-bold">{slotIndex + 1}</span>
          </div>
          <div>
            <p className="text-sm font-medium">Slot {slotIndex + 1}</p>
            <p className="text-xs text-zinc-600">Click to add a Pokémon</p>
          </div>
        </div>
      )}
    </button>
  );
}
