"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { api } from "~/trpc/react";
import { Button } from "~/app/_components/Button";
import { PokemonPickerModal } from "~/app/_components/PokemonPickerModal";
import { ConfirmModal } from "./ConfirmModal";
import { TeamSlotList } from "./TeamSlotList";
import { PokemonResearchPanel } from "./PokemonResearchPanel";
import { TeamCoveragePanel } from "./TeamCoveragePanel";
import { SaveTeamModal } from "./SaveTeamModal";
import { SavedTeamsPanel } from "./SavedTeamsPanel";
import { type PokemonSummary, type TeamSlotConfig, ZERO_STATS } from "~/lib/types";
import { type CompetitiveItem } from "~/lib/items";
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

function buildSlotData(slots: (TeamSlotConfig | null)[]) {
  return slots
    .filter((s): s is TeamSlotConfig => s !== null)
    .map(s => ({
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
    }));
}

export function TeamBuilder() {
  const [slots, setSlots] = useState<(TeamSlotConfig | null)[]>(EMPTY_SLOTS());
  const [activeSlotIndex, setActiveSlotIndex] = useState<number>(0);
  const [pickerOpenForSlot, setPickerOpenForSlot] = useState<number | null>(null);
  const [items, setItems] = useState<Record<number, CompetitiveItem | null>>({});
  const [showSave, setShowSave] = useState(false);

  // Loaded team tracking
  const [loadedTeamId, setLoadedTeamId] = useState<number | null>(null);
  const [loadedTeamName, setLoadedTeamName] = useState("");
  const [isDirty, setIsDirty] = useState(false);

  // Pending actions requiring confirmation
  const [pendingLoadId, setPendingLoadId] = useState<number | null>(null);
  const pendingLoadIdRef = useRef<number | null>(null);
  const [pendingOverride, setPendingOverride] = useState<{ id: number; name: string } | null>(null);

  const saveButtonRef = useRef<HTMLButtonElement>(null);

  const utils = api.useUtils();
  const { data: teams = [] } = api.team.list.useQuery();

  // Warn on browser refresh/close when dirty
  useEffect(() => {
    if (!isDirty) return;
    function onBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  function syncPendingLoad(id: number | null) {
    pendingLoadIdRef.current = id;
    setPendingLoadId(id);
  }

  const executeLoad = useCallback(async (teamId: number) => {
    const loadedSlots = await utils.team.loadForBuilder.fetch({ id: teamId });
    const padded = [
      ...loadedSlots,
      ...Array<TeamSlotConfig | null>(6 - loadedSlots.length).fill(null),
    ] as (TeamSlotConfig | null)[];
    const team = teams.find(t => t.id === teamId);
    setSlots(padded);
    setItems({});
    setActiveSlotIndex(0);
    setLoadedTeamId(teamId);
    setLoadedTeamName(team?.name ?? "");
    setIsDirty(false);
    syncPendingLoad(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [utils, teams]);

  const saveTeam = api.team.create.useMutation({
    onSuccess: async (result) => {
      await utils.team.list.invalidate();
      setShowSave(false);
      setLoadedTeamId(result.id);
      setLoadedTeamName(result.name);
      setIsDirty(false);
      const pid = pendingLoadIdRef.current;
      if (pid !== null) {
        syncPendingLoad(null);
        await executeLoad(pid);
      }
    },
  });

  const updateTeam = api.team.update.useMutation({
    onSuccess: async (result) => {
      await utils.team.list.invalidate();
      setShowSave(false);
      setLoadedTeamId(result.id);
      setLoadedTeamName(result.name);
      setIsDirty(false);
      const pid = pendingLoadIdRef.current;
      if (pid !== null) {
        syncPendingLoad(null);
        await executeLoad(pid);
      }
    },
  });

  useKeyboardShortcuts({
    onSearch: () => {
      const firstEmpty = slots.findIndex(s => s === null);
      if (firstEmpty !== -1) {
        setActiveSlotIndex(firstEmpty);
        setPickerOpenForSlot(firstEmpty);
      }
    },
  });

  function handleSelectSlot(i: number) {
    setActiveSlotIndex(i);
    if (!slots[i]) setPickerOpenForSlot(i);
  }

  function setPokemon(slotIndex: number, pokemon: PokemonSummary) {
    // Prevent duplicate Pokemon in the same team
    const duplicate = slots.some((s, i) => i !== slotIndex && s?.pokemon.pokeApiId === pokemon.pokeApiId);
    if (duplicate) {
      setPickerOpenForSlot(null);
      return;
    }
    setSlots(prev => {
      const next = [...prev];
      next[slotIndex] = newSlot(slotIndex, pokemon);
      return next;
    });
    setPickerOpenForSlot(null);
    setIsDirty(true);
    const nextEmpty = slots.findIndex((s, i) => i !== slotIndex && s === null);
    if (nextEmpty === -1) {
      setTimeout(() => saveButtonRef.current?.focus(), 80);
    }
  }

  function removeSlot(position: number) {
    setSlots(prev => {
      const next = [...prev];
      next[position] = null;
      return next;
    });
    setItems(prev => {
      const next = { ...prev };
      delete next[position];
      return next;
    });
    setIsDirty(true);
  }

  function updateSlot(index: number, updates: Partial<Omit<TeamSlotConfig, "position" | "pokemon">>) {
    setSlots(prev => {
      const next = [...prev];
      const slot = next[index];
      if (!slot) return prev;
      next[index] = { ...slot, ...updates };
      return next;
    });
    setIsDirty(true);
  }

  function handleLoadTeam(teamId: number): Promise<void> {
    if (isDirty) {
      syncPendingLoad(teamId);
      return Promise.resolve();
    }
    return executeLoad(teamId);
  }

  function handleSave(name: string) {
    const slotData = buildSlotData(slots);
    const trimmed = name.trim();

    // Editing an existing loaded team — just update it
    if (loadedTeamId !== null) {
      updateTeam.mutate({ id: loadedTeamId, name: trimmed, slots: slotData });
      return;
    }

    // New team — check for name collision
    const collision = teams.find(t => t.name.toLowerCase() === trimmed.toLowerCase());
    if (collision) {
      setShowSave(false);
      setPendingOverride({ id: collision.id, name: trimmed });
      return;
    }

    saveTeam.mutate({ name: trimmed, slots: slotData });
  }

  function handleOverrideConfirm() {
    if (!pendingOverride) return;
    updateTeam.mutate({
      id: pendingOverride.id,
      name: pendingOverride.name,
      slots: buildSlotData(slots),
    });
    setPendingOverride(null);
  }

  const isSaving = saveTeam.isPending || updateTeam.isPending;

  const filledCount = slots.filter(Boolean).length;

  // Names of Pokemon already in the team (excluding the slot being replaced)
  const takenNames = slots
    .filter((s, i) => i !== pickerOpenForSlot)
    .map(s => s?.pokemon.name)
    .filter((n): n is string => n !== undefined);

  // Override cancel name — passed as initialName when save modal reopens
  const [overrideCancelName, setOverrideCancelName] = useState("");

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {loadedTeamId !== null && (
            <div className="flex items-center gap-1.5 rounded-lg bg-zinc-800/80 px-2.5 py-1 text-xs text-zinc-400">
              <span className={`h-1.5 w-1.5 rounded-full ${isDirty ? "bg-yellow-400" : "bg-green-500"}`} />
              <span className="capitalize">{loadedTeamName}</span>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          {filledCount > 0 && (
            <Button ref={saveButtonRef} variant="primary" size="md" onClick={() => setShowSave(true)}>
              {loadedTeamId !== null ? "Update Team" : "Save Team"}
            </Button>
          )}
        </div>
      </div>

      {/* 3-column layout */}
      <div className="grid gap-4 lg:grid-cols-[17rem_1fr_21rem] lg:items-start">
        <TeamSlotList
          slots={slots}
          activeIndex={activeSlotIndex}
          onSelectSlot={handleSelectSlot}
          onRemoveSlot={removeSlot}
        />
        <PokemonResearchPanel
          slot={slots[activeSlotIndex] ?? null}
          slotIndex={activeSlotIndex}
          onUpdateSlot={updateSlot}
          onSetPokemon={setPokemon}
          onOpenPicker={() => setPickerOpenForSlot(activeSlotIndex)}
          item={items[activeSlotIndex] ?? null}
          onItemChange={it => {
            setItems(prev => ({ ...prev, [activeSlotIndex]: it }));
            setIsDirty(true);
          }}
        />
        <div className="flex flex-col gap-4">
          <TeamCoveragePanel slots={slots} />
          <SavedTeamsPanel onLoad={handleLoadTeam} />
        </div>
      </div>

      {/* Pokemon picker */}
      {pickerOpenForSlot !== null && (
        <PokemonPickerModal
          label={`Slot ${pickerOpenForSlot + 1}`}
          current={slots[pickerOpenForSlot]?.pokemon ?? null}
          onSelect={p => setPokemon(pickerOpenForSlot, p)}
          onClose={() => setPickerOpenForSlot(null)}
          confirmLabel="Add to Team"
          disabledNames={takenNames}
        />
      )}

      {/* Save / Update modal */}
      {showSave && (
        <SaveTeamModal
          onSave={handleSave}
          onClose={() => setShowSave(false)}
          isSaving={isSaving}
          initialName={overrideCancelName || loadedTeamName}
          isUpdate={loadedTeamId !== null}
        />
      )}

      {/* Name collision — override prompt */}
      {pendingOverride !== null && (
        <ConfirmModal
          title="Team name already taken"
          message={
            <>
              A team named <span className="font-semibold text-white">&ldquo;{pendingOverride.name}&rdquo;</span> already
              exists. Override it with your current team?
            </>
          }
          actions={[
            {
              label: "Override",
              variant: "danger",
              onClick: handleOverrideConfirm,
            },
            {
              label: "Cancel — pick a different name",
              variant: "ghost",
              onClick: () => {
                setOverrideCancelName(pendingOverride.name);
                setPendingOverride(null);
                setShowSave(true);
              },
            },
          ]}
        />
      )}

      {/* Unsaved changes — load confirm */}
      {pendingLoadId !== null && (
        <ConfirmModal
          title="Unsaved changes"
          message="Your current team has unsaved changes. What would you like to do?"
          actions={[
            {
              label: "Save & Load",
              variant: "primary",
              onClick: () => {
                setShowSave(true);
                // pendingLoadId stays set — after save completes, executeLoad fires
              },
            },
            {
              label: "Discard changes & Load",
              variant: "danger",
              onClick: () => void executeLoad(pendingLoadId),
            },
            {
              label: "Cancel",
              variant: "ghost",
              onClick: () => syncPendingLoad(null),
            },
          ]}
        />
      )}
    </div>
  );
}
