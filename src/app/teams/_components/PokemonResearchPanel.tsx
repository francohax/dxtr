"use client";

import Image from "next/image";
import { TypeBadge } from "~/app/_components/TypeBadge";
import { StatBar } from "~/app/_components/StatBar";
import { PokemonSearch } from "./PokemonSearch";
import { NatureSelector } from "./NatureSelector";
import { StatEditor } from "./StatEditor";
import { MoveSelector } from "./MoveSelector";
import { ComputedStatsTable } from "./ComputedStatsTable";
import { TypeMatchupGrid } from "./TypeMatchupGrid";
import { type PokemonSummary, type MoveDetail, type TeamSlotConfig } from "~/lib/types";

interface PokemonResearchPanelProps {
  slot: TeamSlotConfig | null;
  slotIndex: number;
  onUpdateSlot: (index: number, updates: Partial<Omit<TeamSlotConfig, "position" | "pokemon">>) => void;
  onSetPokemon: (index: number, pokemon: PokemonSummary) => void;
  searchKey: number;
}

const STAT_LABELS: { key: keyof PokemonSummary["baseStats"]; label: string }[] = [
  { key: "hp",        label: "HP" },
  { key: "attack",    label: "Atk" },
  { key: "defense",   label: "Def" },
  { key: "spAttack",  label: "SpA" },
  { key: "spDefense", label: "SpD" },
  { key: "speed",     label: "Spe" },
];

export function PokemonResearchPanel({
  slot,
  slotIndex,
  onUpdateSlot,
  onSetPokemon,
  searchKey,
}: PokemonResearchPanelProps) {
  if (!slot) {
    return (
      <div className="flex flex-1 flex-col rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/40 p-6">
        <p className="mb-4 text-sm font-medium text-zinc-400">
          Slot {slotIndex + 1} — Search for a Pokémon
        </p>
        <PokemonSearch
          key={searchKey}
          onSelect={p => onSetPokemon(slotIndex, p)}
          autoFocus={false}
        />
      </div>
    );
  }

  const { pokemon, nature, evs, ivs, ivsEnabled, moves } = slot;

  function toggleMove(move: MoveDetail) {
    const exists = moves.findIndex(m => m.name === move.name);
    if (exists !== -1) {
      onUpdateSlot(slotIndex, { moves: moves.filter((_, i) => i !== exists) });
    } else if (moves.length < 4) {
      onUpdateSlot(slotIndex, { moves: [...moves, move] });
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-6 overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Image
          src={pokemon.sprite}
          alt={pokemon.name}
          width={96}
          height={96}
          className="shrink-0 drop-shadow"
          unoptimized
        />
        <div className="flex-1">
          <h2 className="text-2xl font-bold capitalize leading-tight">{pokemon.name}</h2>
          <div className="mt-1.5 flex gap-1.5">
            {pokemon.types.map(t => <TypeBadge key={t} type={t} />)}
          </div>
        </div>
        <NatureSelector
          value={nature}
          onChange={n => onUpdateSlot(slotIndex, { nature: n })}
        />
      </div>

      {/* Base stats quick view */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-zinc-500">
          Base Stats
        </p>
        <div className="space-y-1.5">
          {STAT_LABELS.map(({ key, label }) => (
            <StatBar key={key} label={label} value={pokemon.baseStats[key]} max={255} />
          ))}
        </div>
      </div>

      {/* Computed stats + EV/IV editor */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ComputedStatsTable
          pokemon={pokemon}
          nature={nature}
          evs={evs}
          ivs={ivs}
          ivsEnabled={ivsEnabled}
        />
        <StatEditor
          evs={evs}
          ivs={ivs}
          ivsEnabled={ivsEnabled}
          onEvsChange={e => onUpdateSlot(slotIndex, { evs: e })}
          onIvsChange={i => onUpdateSlot(slotIndex, { ivs: i })}
          onIvsToggle={en => onUpdateSlot(slotIndex, { ivsEnabled: en })}
        />
      </div>

      {/* Moves */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-zinc-500">
          Moves <span className="font-normal normal-case text-zinc-600">(max 4)</span>
        </p>
        <MoveSelector
          moveNames={pokemon.moveNames}
          selectedMoves={moves}
          onToggle={toggleMove}
        />
      </div>

      {/* Type matchups */}
      <TypeMatchupGrid defenderTypes={pokemon.types} />
    </div>
  );
}
