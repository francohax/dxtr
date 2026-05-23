"use client";

import { useState, useRef } from "react";
import { api } from "~/trpc/react";
import { PokemonSearch } from "./PokemonSearch";
import { TeamSlot } from "./TeamSlot";
import { MoveSelector } from "./MoveSelector";
import { NatureSelector } from "./NatureSelector";
import { StatEditor } from "./StatEditor";
import { SaveTeamModal } from "./SaveTeamModal";
import { SavedTeamsPanel } from "./SavedTeamsPanel";
import { type PokemonSummary, type MoveDetail, type TeamSlotConfig, type StatSet, ZERO_STATS } from "~/lib/types";
import { useKeyboardShortcuts } from "~/hooks/useKeyboardShortcuts";

const EMPTY_SLOTS = (): (TeamSlotConfig | null)[] => Array(6).fill(null);

function newSlot(position: number, pokemon: PokemonSummary): TeamSlotConfig {
  return {
    position,
    pokemon,
    moves: [],
    nature: "hardy",
    evs: { ...ZERO_STATS },
    ivs: { ...ZERO_STATS },
    ivsEnabled: false,
  };
}

export function TeamBuilder() {
  const [slots, setSlots] = useState<(TeamSlotConfig | null)[]>(EMPTY_SLOTS());
  const [activeSlotIndex, setActiveSlotIndex] = useState<number | null>(null);
  const [activeSearch, setActiveSearch] = useState(false);
  const [searchKey, setSearchKey] = useState(0);
  const [editingSlot, setEditingSlot] = useState<number | null>(null);
  const [showSave, setShowSave] = useState(false);
  const saveButtonRef = useRef<HTMLButtonElement>(null);

  useKeyboardShortcuts({
    onSearch: () => {
      const firstEmpty = slots.findIndex(s => s === null);
      if (firstEmpty !== -1) openSearch(firstEmpty);
    },
  });

  const utils = api.useUtils();
  const saveTeam = api.team.create.useMutation({
    onSuccess: async () => {
      await utils.team.list.invalidate();
      setShowSave(false);
    },
  });

  function openSearch(slotIndex: number) {
    setActiveSlotIndex(slotIndex);
    setActiveSearch(true);
    setEditingSlot(null);
    setSearchKey(k => k + 1);
  }

  function addPokemon(pokemon: PokemonSummary) {
    const target = activeSlotIndex ?? slots.findIndex(s => s === null);
    if (target === -1) return;

    const newSlots = [...slots];
    newSlots[target] = newSlot(target, pokemon);
    setSlots(newSlots);

    const next = newSlots.findIndex(s => s === null);
    if (next !== -1) {
      setActiveSlotIndex(next);
      setSearchKey(k => k + 1);
    } else {
      setActiveSearch(false);
      setActiveSlotIndex(null);
      setTimeout(() => saveButtonRef.current?.focus(), 80);
    }
  }

  function removeSlot(position: number) {
    setSlots(prev => {
      const next = [...prev];
      next[position] = null;
      return next;
    });
    if (editingSlot === position) setEditingSlot(null);
  }

  function toggleMove(slotIndex: number, move: MoveDetail) {
    setSlots(prev => {
      const next = [...prev];
      const slot = next[slotIndex];
      if (!slot) return prev;
      const exists = slot.moves.findIndex(m => m.name === move.name);
      if (exists !== -1) {
        next[slotIndex] = { ...slot, moves: slot.moves.filter((_, i) => i !== exists) };
      } else if (slot.moves.length < 4) {
        next[slotIndex] = { ...slot, moves: [...slot.moves, move] };
      }
      return next;
    });
  }

  function updateSlot<K extends keyof TeamSlotConfig>(slotIndex: number, key: K, value: TeamSlotConfig[K]) {
    setSlots(prev => {
      const next = [...prev];
      const slot = next[slotIndex];
      if (!slot) return prev;
      next[slotIndex] = { ...slot, [key]: value };
      return next;
    });
  }

  function handleSave(name: string) {
    const filledSlots = slots.filter((s): s is TeamSlotConfig => s !== null);
    saveTeam.mutate({
      name,
      slots: filledSlots.map(s => ({
        position: s.position,
        pokeApiId: s.pokemon.pokeApiId,
        name: s.pokemon.name,
        sprite: s.pokemon.sprite,
        types: s.pokemon.types,
        nature: s.nature,
        evHp: s.evs.hp,
        evAtk: s.evs.attack,
        evDef: s.evs.defense,
        evSpAtk: s.evs.spAttack,
        evSpDef: s.evs.spDefense,
        evSpeed: s.evs.speed,
        ivHp: s.ivs.hp,
        ivAtk: s.ivs.attack,
        ivDef: s.ivs.defense,
        ivSpAtk: s.ivs.spAttack,
        ivSpDef: s.ivs.spDefense,
        ivSpeed: s.ivs.speed,
        ivsEnabled: s.ivsEnabled,
        moves: s.moves.map((m, i) => ({
          position: i,
          pokeApiId: m.pokeApiId,
          name: m.name,
          type: m.type,
          category: m.category,
          power: m.power,
          accuracy: m.accuracy,
          pp: m.pp,
        })),
      })),
    });
  }

  async function handleLoadTeam(teamId: number) {
    const loadedSlots = await utils.team.loadForBuilder.fetch({ id: teamId });
    const padded = [
      ...loadedSlots,
      ...Array(6 - loadedSlots.length).fill(null),
    ] as (TeamSlotConfig | null)[];
    setSlots(padded);
    setActiveSearch(false);
    setEditingSlot(null);
    setActiveSlotIndex(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const filledCount = slots.filter(Boolean).length;
  const editingSlotData = editingSlot !== null ? slots[editingSlot] : null;

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {slots.map((slot, i) => (
          <div
            key={i}
            onClick={() => { if (!slot) openSearch(i); }}
            className={slot ? "" : "cursor-pointer"}
          >
            <TeamSlot
              position={i}
              pokemon={slot?.pokemon ?? null}
              moves={slot?.moves ?? []}
              nature={slot?.nature ?? "hardy"}
              isActive={activeSlotIndex === i && activeSearch}
              onRemove={() => removeSlot(i)}
              onConfigure={() => { setEditingSlot(i); setActiveSearch(false); }}
            />
          </div>
        ))}
      </div>

      {activeSearch && (
        <div className="animate-fade-in rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">
              Add Pokemon{activeSlotIndex !== null ? ` — Slot ${activeSlotIndex + 1}` : ""}
            </h2>
            <button
              onClick={() => { setActiveSearch(false); setActiveSlotIndex(null); }}
              className="text-sm text-zinc-500 hover:text-white"
            >
              Close
            </button>
          </div>
          <PokemonSearch key={searchKey} onSelect={addPokemon} autoFocus />
        </div>
      )}

      {editingSlot !== null && editingSlotData && (
        <div className="animate-fade-in rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold capitalize">{editingSlotData.pokemon.name}</h2>
            <button onClick={() => setEditingSlot(null)} className="text-sm text-zinc-500 hover:text-white">
              Done
            </button>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <p className="mb-3 text-sm font-medium text-zinc-400">Moves <span className="text-zinc-600">(max 4)</span></p>
              <MoveSelector
                moveNames={editingSlotData.pokemon.moveNames}
                selectedMoves={editingSlotData.moves}
                onToggle={move => toggleMove(editingSlot, move)}
              />
            </div>
            <div className="flex flex-col gap-4">
              <NatureSelector
                value={editingSlotData.nature}
                onChange={nature => updateSlot(editingSlot, "nature", nature)}
              />
              <StatEditor
                evs={editingSlotData.evs}
                ivs={editingSlotData.ivs}
                ivsEnabled={editingSlotData.ivsEnabled}
                onEvsChange={evs => updateSlot(editingSlot, "evs", evs as StatSet)}
                onIvsChange={ivs => updateSlot(editingSlot, "ivs", ivs as StatSet)}
                onIvsToggle={enabled => updateSlot(editingSlot, "ivsEnabled", enabled)}
              />
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        {!activeSearch && filledCount < 6 && (
          <button
            onClick={() => {
              const firstEmpty = slots.findIndex(s => s === null);
              if (firstEmpty !== -1) openSearch(firstEmpty);
            }}
            className="rounded-xl border border-dashed border-zinc-700 px-4 py-2 text-sm text-zinc-400 transition hover:border-violet-600 hover:text-violet-400"
          >
            + Add Pokemon
          </button>
        )}
        {filledCount > 0 && (
          <button
            ref={saveButtonRef}
            onClick={() => setShowSave(true)}
            className="ml-auto rounded-xl bg-violet-600 px-6 py-2 text-sm font-semibold text-white transition hover:bg-violet-500"
          >
            Save Team
          </button>
        )}
      </div>

      <SavedTeamsPanel onLoad={handleLoadTeam} />

      {showSave && (
        <SaveTeamModal
          onSave={handleSave}
          onClose={() => setShowSave(false)}
          isSaving={saveTeam.isPending}
        />
      )}
    </div>
  );
}
