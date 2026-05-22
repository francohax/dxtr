"use client";

import Image from "next/image";
import { TypeBadge } from "~/app/_components/TypeBadge";
import { type PokemonSummary, type MoveDetail, type PokemonType } from "~/lib/types";

interface TeamSlotProps {
  position: number;
  pokemon: PokemonSummary | null;
  moves: MoveDetail[];
  nature: string;
  isActive: boolean;
  onRemove: () => void;
  onConfigure: () => void;
}

export function TeamSlot({ position, pokemon, moves, nature, isActive, onRemove, onConfigure }: TeamSlotProps) {
  if (!pokemon) {
    return (
      <div className={`flex h-36 flex-col items-center justify-center rounded-2xl border-2 border-dashed transition ${
        isActive
          ? "border-violet-500 bg-violet-950/20 text-violet-400"
          : "border-zinc-800 text-zinc-600 hover:border-zinc-700"
      }`}>
        <span className="text-2xl">+</span>
        <span className="text-xs">Slot {position + 1}</span>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col gap-2 rounded-2xl border border-zinc-800 bg-zinc-900 p-3 transition hover:border-zinc-700">
      <button
        onClick={onRemove}
        className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full text-zinc-600 transition hover:bg-zinc-700 hover:text-white"
        aria-label="Remove pokemon"
      >
        ×
      </button>
      <div className="flex items-center gap-3">
        <Image
          src={pokemon.sprite}
          alt={pokemon.name}
          width={56}
          height={56}
          className="shrink-0 drop-shadow"
          unoptimized
        />
        <div className="flex flex-col gap-1">
          <span className="text-sm font-bold capitalize">{pokemon.name}</span>
          <div className="flex flex-wrap gap-1">
            {pokemon.types.map(t => <TypeBadge key={t} type={t as PokemonType} size="sm" />)}
          </div>
          <span className="text-xs capitalize text-zinc-500">{nature}</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-1">
        {moves.length === 0 ? (
          <span className="text-xs text-zinc-600">No moves assigned</span>
        ) : (
          moves.map(m => (
            <span key={m.name} className="rounded-md bg-zinc-800 px-2 py-0.5 text-xs capitalize text-zinc-300">
              {m.name.replace(/-/g, " ")}
            </span>
          ))
        )}
      </div>
      <button
        onClick={onConfigure}
        className="mt-1 w-full rounded-lg bg-zinc-800 py-1 text-xs font-medium text-zinc-300 transition hover:bg-zinc-700"
      >
        Configure
      </button>
    </div>
  );
}
