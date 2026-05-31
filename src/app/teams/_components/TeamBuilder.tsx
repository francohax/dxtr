"use client";

import { useState, useRef } from "react";
import { api } from "~/trpc/react";
import { TeamSlotList } from "./TeamSlotList";
import { PokemonResearchPanel } from "./PokemonResearchPanel";
import { TeamCoveragePanel } from "./TeamCoveragePanel";
import { SaveTeamModal } from "./SaveTeamModal";
import { SavedTeamsPanel } from "./SavedTeamsPanel";
import { type PokemonSummary, type TeamSlotConfig, ZERO_STATS } from "~/lib/types";
import { useKeyboardShortcuts } from "~/hooks/useKeyboardShortcuts";

const EMPTY_SLOTS = (): (TeamSlotConfig | null)[] => Array<TeamSlotConfig | null>(6).fill(null);

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
  const [activeSlotIndex, setActiveSlotIndex] = useState<number>(0);
  const [searchKey, setSearchKey] = useState(0);
  const [showSave, setShowSave] = useState(false);
  const saveButtonRef = useRef<HTMLButtonElement>(null);

  useKeyboardShortcuts({
    onSearch: () => {
      const firstEmpty = slots.findIndex(s => s === null);
      if (firstEmpty !== -1) {
        setActiveSlotIndex(firstEmpty);
        setSearchKey(k => k + 1);
      }
    },
  });

  const utils = api.useUtils();
  const saveTeam = api.team.create.useMutation({
    onSuccess: async () => {
      await utils.team.list.invalidate();
      setShowSave(false);
    },
  });

  function setPokemon(slotIndex: number, pokemon: PokemonSummary) {
    setSlots(prev => {
      const next = [...prev];
      next[slotIndex] = newSlot(slotIndex, pokemon);
      return next;
    });
    const nextEmpty = slots.findIndex((s, i) => i !== slotIndex && s === null);
    if (nextEmpty !== -1) {
      setActiveSlotIndex(nextEmpty);
      setSearchKey(k => k + 1);
    } else {
      setTimeout(() => saveButtonRef.current?.focus(), 80);
    }
  }

  function removeSlot(position: number) {
    setSlots(prev => {
      const next = [...prev];
      next[position] = null;
      return next;
    });
  }

  function updateSlot(index: number, updates: Partial<Omit<TeamSlotConfig, "position" | "pokemon">>) {
    setSlots(prev => {
      const next = [...prev];
      const slot = next[index];
      if (!slot) return prev;
      next[index] = { ...slot, ...updates };
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
      ...Array<TeamSlotConfig | null>(6 - loadedSlots.length).fill(null),
    ] as (TeamSlotConfig | null)[];
    setSlots(padded);
    setActiveSlotIndex(0);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const filledCount = slots.filter(Boolean).length;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Team Builder</h1>
        <div className="flex gap-2">
          {filledCount > 0 && (
            <button
              ref={saveButtonRef}
              onClick={() => setShowSave(true)}
              className="rounded-xl bg-violet-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-violet-500"
            >
              Save Team
            </button>
          )}
        </div>
      </div>

      {/* Two-panel layout */}
      <div className="flex gap-4">
        <TeamSlotList
          slots={slots}
          activeIndex={activeSlotIndex}
          onSelectSlot={setActiveSlotIndex}
          onRemoveSlot={removeSlot}
        />
        <PokemonResearchPanel
          slot={slots[activeSlotIndex] ?? null}
          slotIndex={activeSlotIndex}
          onUpdateSlot={updateSlot}
          onSetPokemon={setPokemon}
          searchKey={searchKey}
        />
      </div>

      {/* Coverage analytics */}
      <TeamCoveragePanel slots={slots} />

      {/* Saved teams */}
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
