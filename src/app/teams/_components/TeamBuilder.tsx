"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { PokemonSearch } from "./PokemonSearch";
import { TeamSlot } from "./TeamSlot";
import { MoveSelector } from "./MoveSelector";
import { SaveTeamModal } from "./SaveTeamModal";
import { type PokemonSummary, type MoveDetail, type TeamSlotConfig } from "~/lib/types";

export function TeamBuilder() {
  const [slots, setSlots] = useState<(TeamSlotConfig | null)[]>(Array(6).fill(null));
  const [activeSearch, setActiveSearch] = useState(false);
  const [editingSlot, setEditingSlot] = useState<number | null>(null);
  const [showSave, setShowSave] = useState(false);

  const utils = api.useUtils();
  const saveTeam = api.team.create.useMutation({
    onSuccess: async () => {
      await utils.team.list.invalidate();
      setShowSave(false);
    },
  });

  function addPokemon(pokemon: PokemonSummary) {
    const firstEmpty = slots.findIndex(s => s === null);
    if (firstEmpty === -1) return;
    setSlots(prev => {
      const next = [...prev];
      next[firstEmpty] = { position: firstEmpty, pokemon, moves: [] };
      return next;
    });
    setActiveSearch(false);
  }

  function removeSlot(position: number) {
    setSlots(prev => {
      const next = [...prev];
      next[position] = null;
      return next;
    });
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

  const filledCount = slots.filter(Boolean).length;
  const editingSlotData = editingSlot !== null ? slots[editingSlot] : null;

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {slots.map((slot, i) => (
          <div key={i} onClick={() => !slot && setActiveSearch(true)} className="cursor-pointer">
            <TeamSlot
              position={i}
              pokemon={slot?.pokemon ?? null}
              moves={slot?.moves ?? []}
              onRemove={() => removeSlot(i)}
              onEditMoves={() => setEditingSlot(i)}
            />
          </div>
        ))}
      </div>

      {activeSearch && (
        <div className="animate-fade-in rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Add Pokemon</h2>
            <button onClick={() => setActiveSearch(false)} className="text-sm text-zinc-500 hover:text-white">
              Close
            </button>
          </div>
          <PokemonSearch onSelect={addPokemon} />
        </div>
      )}

      {editingSlot !== null && editingSlotData && (
        <div className="animate-fade-in rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold capitalize">
              Moves — {editingSlotData.pokemon.name}
            </h2>
            <button onClick={() => setEditingSlot(null)} className="text-sm text-zinc-500 hover:text-white">
              Done
            </button>
          </div>
          <MoveSelector
            moveNames={editingSlotData.pokemon.moveNames}
            selectedMoves={editingSlotData.moves}
            onToggle={move => toggleMove(editingSlot, move)}
          />
        </div>
      )}

      <div className="flex items-center gap-3">
        {!activeSearch && filledCount < 6 && (
          <button
            onClick={() => setActiveSearch(true)}
            className="rounded-xl border border-dashed border-zinc-700 px-4 py-2 text-sm text-zinc-400 transition hover:border-violet-600 hover:text-violet-400"
          >
            + Add Pokemon
          </button>
        )}
        {filledCount > 0 && (
          <button
            onClick={() => setShowSave(true)}
            className="ml-auto rounded-xl bg-violet-600 px-6 py-2 text-sm font-semibold text-white transition hover:bg-violet-500"
          >
            Save Team
          </button>
        )}
      </div>

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
