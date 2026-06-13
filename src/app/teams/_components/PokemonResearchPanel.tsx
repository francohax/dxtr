"use client";

import Image from "next/image";
import { TypeBadge } from "~/app/_components/TypeBadge";
import { Button } from "~/app/_components/Button";
import { NaturePicker } from "~/app/_components/NaturePicker";
import { ItemSearch } from "~/app/_components/ItemSearch";
import { MoveFuzzySearch } from "~/app/_components/MoveFuzzySearch";
import { StatEditor } from "./StatEditor";
import { TypeMatchupGrid } from "./TypeMatchupGrid";
import { calcStat, getNatureMultiplier, type StatKey } from "~/lib/natures";
import { type PokemonSummary, type MoveDetail, type TeamSlotConfig } from "~/lib/types";
import { type CompetitiveItem } from "~/lib/items";

interface PokemonResearchPanelProps {
  slot: TeamSlotConfig | null;
  slotIndex: number;
  onUpdateSlot: (index: number, updates: Partial<Omit<TeamSlotConfig, "position" | "pokemon">>) => void;
  onSetPokemon: (index: number, pokemon: PokemonSummary) => void;
  onOpenPicker: () => void;
  item: CompetitiveItem | null;
  onItemChange: (item: CompetitiveItem | null) => void;
}

const STAT_ROWS: { statKey: StatKey; label: string; color: string }[] = [
  { statKey: "hp", label: "HP", color: "#4ade80" },
  { statKey: "attack", label: "Atk", color: "#f87171" },
  { statKey: "defense", label: "Def", color: "#fb923c" },
  { statKey: "spAttack", label: "SpA", color: "#818cf8" },
  { statKey: "spDefense", label: "SpD", color: "#34d399" },
  { statKey: "speed", label: "Spe", color: "#facc15" },
];

export function PokemonResearchPanel({
  slot,
  slotIndex,
  onUpdateSlot,
  onSetPokemon: _onSetPokemon,
  onOpenPicker,
  item,
  onItemChange,
}: PokemonResearchPanelProps) {
  if (!slot) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/40 p-12 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-600">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="16" />
            <line x1="8" y1="12" x2="16" y2="12" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-zinc-300">No Pokémon selected</p>
          <p className="mt-1 text-xs text-zinc-600">Slot {slotIndex + 1} is empty</p>
        </div>
        <Button variant="primary" size="md" onClick={onOpenPicker}>
          Add Pokémon
        </Button>
      </div>
    );
  }

  const { pokemon, nature, evs, ivs, ivsEnabled, moves } = slot;
  const bst = Object.values(pokemon.baseStats).reduce((a, b) => a + b, 0);

  function setMove(index: number, move: MoveDetail) {
    const next = [...moves] as (MoveDetail | null)[];
    while (next.length <= index) next.push(null);
    next[index] = move;
    onUpdateSlot(slotIndex, { moves: next.filter((m): m is MoveDetail => m !== null) });
  }

  function clearMove(index: number) {
    const next = moves.filter((_, i) => i !== index);
    onUpdateSlot(slotIndex, { moves: next });
  }

  const moveSlots = [moves[0] ?? null, moves[1] ?? null, moves[2] ?? null, moves[3] ?? null] as const;

  return (
    <div className="p-4 flex flex-col gap-1">

      <div className="relative z-10 w-full flex gap-1">
        {/* Header card — 2×2 grid */}
        <div className="relative w-1/2 panel-card p-4">

          {/* Change button — floats top-right, desktop only */}
          <Button
            className="absolute top-3 right-3 z-20 hidden md:flex h-7"
            variant="secondary"
            size="sm"
            onClick={onOpenPicker}
          >
            Change
          </Button>

          <div className="grid grid-cols-2 gap-x-3 gap-y-4">

            {/* Top-left: Pokemon image — clickable to change */}
            <button
              onClick={onOpenPicker}
              className="group relative flex items-center justify-center rounded-xl"
              aria-label="Change Pokémon"
            >
              <Image
                src={pokemon.sprite}
                alt={pokemon.name}
                width={120}
                height={120}
                className="drop-shadow-lg transition-opacity duration-200 group-hover:opacity-50"
                unoptimized
              />
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                <div className="rounded-full bg-black/60 p-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </div>
              </div>
            </button>

            {/* Top-right: Held Item — mt clears the absolute Change button on desktop */}
            <div className="flex flex-col gap-1.5 md:mt-8">
              <span className="section-label">Held Item</span>
              <ItemSearch value={item} onChange={onItemChange} />
            </div>

            {/* Bottom-left: Name, types, BST */}
            <div className="flex flex-col gap-1">
              <h2 className="text-lg font-bold capitalize leading-tight tracking-tight text-white">
                {pokemon.name}
              </h2>
              <div className="flex flex-wrap items-center gap-1.5">
                {pokemon.types.map(t => <TypeBadge key={t} type={t} />)}
                <span className="ml-1 rounded-md bg-zinc-800 px-2 py-0.5 text-[10px] font-semibold text-zinc-500">
                  BST {bst}
                </span>
              </div>
            </div>

            {/* Bottom-right: Nature — z-10 so the picker popover paints above sibling rows */}
            <div className="relative z-10 flex flex-col gap-1.5">
              <span className="section-label">Nature</span>
              <NaturePicker
                value={nature}
                onChange={n => onUpdateSlot(slotIndex, { nature: n })}
              />
            </div>

          </div>
        </div>

        <div className="w-full md:w-1/2 p-4">
          {/* Type matchups */}
          <TypeMatchupGrid defenderTypes={pokemon.types} />
        </div>

      </div>

      {/* Config grid: left (stats + EVs) | right (moves vertical) */}
      <div className="flex flex-wrap gap-2">
        {/* Left column: moves vertical list */}
        <div className="w-full md:w-1/2 panel-card flex flex-col gap-1.5 px-4 py-3">
          <span className="section-label block">Moves</span>
          <div className="w-full grid md:grid-cols-1 lg:grid-cols-2 gap-1">
            {moveSlots.map((move, i) => (
              <MoveFuzzySearch
                key={i}
                moveNames={pokemon.moveNames}
                value={move}
                onSelect={m => setMove(i, m)}
                onClear={() => clearMove(i)}
                attackerSprite={pokemon.sprite}
                attackerName={pokemon.name}
                placeholder={`Move ${i + 1}…`}
              />
            ))}
          </div>
        </div>

        {/* Right column: combined stats card + EV editor */}
        <div className="md:max-w-64 flex lg:flex-col gap-1">
          <div className="panel-card px-4 py-3">
            <div className="mb-3 flex items-baseline justify-between">
              <span className="section-label">Stats</span>
              <span className="text-[10px] text-zinc-600">Base → Lv.50</span>
            </div>
            <div className="space-y-1">
              {STAT_ROWS.map(({ statKey, label, color }) => {
                const base = pokemon.baseStats[statKey];
                const iv = ivsEnabled ? ivs[statKey] : 31;
                const ev = evs[statKey];
                const final = calcStat({ base, iv, ev, level: 50, nature, stat: statKey });
                const mult = getNatureMultiplier(nature, statKey);
                const isBoost = mult > 1;
                const isReduce = mult < 1;
                const barPct = Math.round((base / 255) * 100);

                return (
                  <div key={statKey} className="flex items-center gap-2">
                    <span className="w-7 shrink-0 text-right text-[10px] font-semibold text-zinc-500">{label}</span>
                    <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-800">
                      <div
                        className="absolute inset-y-0 left-0 rounded-full transition-all duration-300"
                        style={{ width: `${barPct}%`, background: color }}
                      />
                    </div>
                    <span className="w-7 shrink-0 text-right text-[10px] tabular-nums text-zinc-600">{base}</span>
                    <svg className="h-2.5 w-2.5 shrink-0 text-zinc-700" viewBox="0 0 12 12">
                      <path d="M2 6h8M7 3l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className={`w-9 shrink-0 text-right text-xs font-bold tabular-nums ${isBoost ? "text-red-400" : isReduce ? "text-blue-400" : "text-white"}`}>
                      {final}
                    </span>
                    <span className="w-3 shrink-0 text-center text-xs">
                      {isBoost ? <span className="text-red-500">↑</span> : isReduce ? <span className="text-blue-500">↓</span> : null}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="panel-card px-4 py-3">
            <StatEditor
              evs={evs}
              ivs={ivs}
              ivsEnabled={ivsEnabled}
              onEvsChange={e => onUpdateSlot(slotIndex, { evs: e })}
              onIvsChange={i => onUpdateSlot(slotIndex, { ivs: i })}
              onIvsToggle={en => onUpdateSlot(slotIndex, { ivsEnabled: en })}
            />
          </div>
        </div>


      </div>

    </div>
  );
}
