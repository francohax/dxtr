"use client";

import { type PokemonType } from "~/lib/types";

export const ALL_TYPES: PokemonType[] = [
  "normal", "fire", "water", "electric", "grass",
  "ice", "fighting", "poison", "ground", "flying",
  "psychic", "bug", "rock", "ghost", "dragon",
  "dark", "steel", "fairy",
];

// Digit keys 1–9 and 0 map to the first 10 types.
export const HOTKEY_MAP: Record<string, PokemonType> = {
  "1": "normal",   "2": "fire",     "3": "water",  "4": "electric", "5": "grass",
  "6": "ice",      "7": "fighting", "8": "poison", "9": "ground",   "0": "flying",
};

const INACTIVE: Record<PokemonType, string> = {
  normal:   "border-[#A8A878]/40 text-[#A8A878] hover:bg-[#A8A878]/20",
  fire:     "border-[#F08030]/40 text-[#F08030] hover:bg-[#F08030]/20",
  water:    "border-[#6890F0]/40 text-[#6890F0] hover:bg-[#6890F0]/20",
  electric: "border-[#F8D030]/40 text-[#F8D030] hover:bg-[#F8D030]/20",
  grass:    "border-[#78C850]/40 text-[#78C850] hover:bg-[#78C850]/20",
  ice:      "border-[#98D8D8]/40 text-[#98D8D8] hover:bg-[#98D8D8]/20",
  fighting: "border-[#C03028]/40 text-[#C03028] hover:bg-[#C03028]/20",
  poison:   "border-[#A040A0]/40 text-[#A040A0] hover:bg-[#A040A0]/20",
  ground:   "border-[#E0C068]/40 text-[#E0C068] hover:bg-[#E0C068]/20",
  flying:   "border-[#A890F0]/40 text-[#A890F0] hover:bg-[#A890F0]/20",
  psychic:  "border-[#F85888]/40 text-[#F85888] hover:bg-[#F85888]/20",
  bug:      "border-[#A8B820]/40 text-[#A8B820] hover:bg-[#A8B820]/20",
  rock:     "border-[#B8A038]/40 text-[#B8A038] hover:bg-[#B8A038]/20",
  ghost:    "border-[#705898]/40 text-[#705898] hover:bg-[#705898]/20",
  dragon:   "border-[#7038F8]/40 text-[#7038F8] hover:bg-[#7038F8]/20",
  dark:     "border-[#705848]/40 text-[#705848] hover:bg-[#705848]/20",
  steel:    "border-[#B8B8D0]/40 text-[#B8B8D0] hover:bg-[#B8B8D0]/20",
  fairy:    "border-[#EE99AC]/40 text-[#EE99AC] hover:bg-[#EE99AC]/20",
};

const ACTIVE: Record<PokemonType, string> = {
  normal:   "bg-[#A8A878]/50 border-[#A8A878] text-white",
  fire:     "bg-[#F08030]/50 border-[#F08030] text-white",
  water:    "bg-[#6890F0]/50 border-[#6890F0] text-white",
  electric: "bg-[#F8D030]/50 border-[#F8D030] text-zinc-900",
  grass:    "bg-[#78C850]/50 border-[#78C850] text-white",
  ice:      "bg-[#98D8D8]/50 border-[#98D8D8] text-zinc-900",
  fighting: "bg-[#C03028]/50 border-[#C03028] text-white",
  poison:   "bg-[#A040A0]/50 border-[#A040A0] text-white",
  ground:   "bg-[#E0C068]/50 border-[#E0C068] text-zinc-900",
  flying:   "bg-[#A890F0]/50 border-[#A890F0] text-white",
  psychic:  "bg-[#F85888]/50 border-[#F85888] text-white",
  bug:      "bg-[#A8B820]/50 border-[#A8B820] text-white",
  rock:     "bg-[#B8A038]/50 border-[#B8A038] text-white",
  ghost:    "bg-[#705898]/50 border-[#705898] text-white",
  dragon:   "bg-[#7038F8]/50 border-[#7038F8] text-white",
  dark:     "bg-[#705848]/50 border-[#705848] text-white",
  steel:    "bg-[#B8B8D0]/50 border-[#B8B8D0] text-zinc-900",
  fairy:    "bg-[#EE99AC]/50 border-[#EE99AC] text-white",
};

interface TypeFilterBarProps {
  selected: PokemonType[];
  onChange: (types: PokemonType[]) => void;
}

export function TypeFilterBar({ selected, onChange }: TypeFilterBarProps) {
  function toggle(type: PokemonType) {
    onChange(
      selected.includes(type) ? selected.filter((t) => t !== type) : [...selected, type],
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
          Type filter
          {selected.length > 0 && (
            <span className="ml-1 text-violet-400">({selected.length} active)</span>
          )}
        </span>
        {selected.length > 0 && (
          <button
            onClick={() => onChange([])}
            className="text-[10px] text-zinc-600 transition hover:text-zinc-400"
          >
            Clear all
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {ALL_TYPES.map((type, i) => {
          const isActive = selected.includes(type);
          const hotkey = i < 9 ? String(i + 1) : i === 9 ? "0" : undefined;
          return (
            <button
              key={type}
              onClick={() => toggle(type)}
              title={hotkey ? `Hotkey: ${hotkey} (when not typing)` : undefined}
              className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold capitalize transition ${
                isActive ? ACTIVE[type] : INACTIVE[type]
              }`}
            >
              {type}
              {hotkey && (
                <span className="font-mono text-[9px] opacity-40">{hotkey}</span>
              )}
            </button>
          );
        })}
      </div>
      {selected.length > 1 && (
        <p className="text-[10px] text-zinc-700">
          Showing{" "}
          <span className="capitalize text-zinc-500">{selected.join(" + ")}</span>
          {" "}dual-type matches
        </p>
      )}
    </div>
  );
}
