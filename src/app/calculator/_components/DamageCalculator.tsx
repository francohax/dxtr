"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import Image from "next/image";
import { api } from "~/trpc/react";
import { calculateDamage, getTypeEffectiveness, calcEffectiveStat, getStatStageMult } from "~/lib/damage";
import { type DamageResult } from "~/lib/damage";
import {
  type PokemonSummary,
  type MoveDetail,
  type PokemonType,
  type BattleConfig,
  DEFAULT_BATTLE_CONFIG,
} from "~/lib/types";
import { DamageResultCard } from "./DamageResult";
import { TypeBadge } from "~/app/_components/TypeBadge";
import { SkeletonBlock } from "~/app/_components/SkeletonBlock";
import { PokemonPickerModal } from "./PokemonPickerModal";
import { MoveFuzzySearch } from "./MoveFuzzySearch";
import { BattleConfigPanel } from "./BattleConfigPanel";
import { StatStagePanel } from "./StatStagePanel";
import { useKeyboardShortcuts } from "~/hooks/useKeyboardShortcuts";
import { useCalculatorKeyboard } from "~/hooks/useCalculatorKeyboard";
import { useFocusChain, type FocusChainEntry } from "~/hooks/useFocusChain";
import { HotkeyModal } from "./HotkeyModal";

const STORAGE_KEY = "dxtr-random-battle";

// ─── EV slider panel ─────────────────────────────────────────────────────────

interface EvStat {
  key: "attack" | "spAttack" | "defense" | "spDefense";
  label: string;
  base: number;
}

interface EvPanelProps {
  stats: EvStat[];
  evs: Record<string, number>;
  level: number;
  activeKey?: string;
  onChange: (key: string, value: number) => void;
  kbFocused?: boolean;
}

function EvPanel({ stats, evs, level, activeKey, onChange, kbFocused }: EvPanelProps) {
  return (
    <div className={`flex flex-col gap-3 rounded-xl border px-3 py-2.5 backdrop-blur-sm transition ${kbFocused
      ? "border-violet-500/60 bg-zinc-800/30 ring-1 ring-violet-500/20"
      : "border-zinc-700/40 bg-zinc-800/20"
      }`}>
      <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">EVs</span>
      {stats.map(({ key, label, base }) => {
        const ev = evs[key] ?? 0;
        const effective = calcEffectiveStat(base, ev, level);
        const isActive = key === activeKey;
        return (
          <div key={key} className={`flex flex-col gap-1 transition-opacity ${isActive ? "opacity-100" : "opacity-40"}`}>
            <div className="flex items-center justify-between">
              <span className={`text-[11px] font-medium ${isActive ? "text-zinc-300" : "text-zinc-500"}`}>
                {label}
              </span>
              <div className="flex items-center gap-2.5">
                <span className="text-[10px] tabular-nums text-zinc-400">{ev} EV</span>
                <span className={`min-w-[2rem] text-right text-[11px] font-bold tabular-nums ${isActive ? "text-violet-400" : "text-zinc-500"}`}>
                  {effective}
                </span>
              </div>
            </div>
            <input
              type="range"
              min={0}
              max={252}
              step={4}
              value={ev}
              onChange={e => onChange(key, Number(e.target.value))}
              className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-zinc-700/60 accent-violet-500"
            />
          </div>
        );
      })}
    </div>
  );
}

// ─── Pokemon slot card ────────────────────────────────────────────────────────

interface PokemonSlotCardProps {
  label: string;
  value: PokemonSummary | null;
  isLoading?: boolean;
  onOpenPicker: () => void;
  containerRef?: React.RefObject<HTMLDivElement | null>;
  kbHighlighted?: boolean;
}

function PokemonSlotCard({ label, value, isLoading, onOpenPicker, containerRef, kbHighlighted }: PokemonSlotCardProps) {
  const typeColor = value?.types[0] ? `var(--color-type-${value.types[0]})` : undefined;

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2" ref={containerRef}>
        <span className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">{label}</span>
        <div className="relative flex flex-col items-center gap-2 overflow-hidden rounded-2xl border border-zinc-700/40 bg-zinc-800/20 p-4">
          <div className="shimmer absolute inset-0" />
          <SkeletonBlock className="h-20 w-20 rounded-xl" />
          <div className="flex w-full flex-col items-center gap-1.5">
            <SkeletonBlock className="h-3.5 w-20" />
            <SkeletonBlock className="h-5 w-14 rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col gap-1 rounded-xl transition`}
      ref={containerRef}
    >
      <span className="pl-2 text-[11px] font-semibold uppercase tracking-widest text-zinc-400">{label}</span>
      {value ? (
        <div
          role="button"
          tabIndex={0}
          onClick={onOpenPicker}
          onKeyDown={e => { if (e.key === "Enter" || e.key === " ") onOpenPicker(); }}
          style={typeColor ? { "--type-glow": typeColor } as React.CSSProperties : undefined}
          className={`group relative flex cursor-pointer flex-col items-center gap-2 rounded-2xl border bg-zinc-800/30 p-4 backdrop-blur-sm transition-all duration-200 ${kbHighlighted
            ? "border-[var(--type-glow,theme(colors.zinc.600))] shadow-[0_0_24px_color-mix(in_srgb,var(--type-glow,transparent)_25%,transparent)]"
            : "border-zinc-700/50 hover:border-[var(--type-glow,theme(colors.zinc.600))] hover:shadow-[0_0_24px_color-mix(in_srgb,var(--type-glow,transparent)_25%,transparent)]"
            }`}
        >
          <div className="relative flex h-20 w-20 items-center justify-center rounded-xl bg-zinc-800/80">
            <Image src={value.sprite} alt={value.name} width={72} height={72} unoptimized className="drop-shadow-lg transition-transform duration-200 group-hover:scale-105" />
          </div>
          <div className="flex flex-col items-center gap-1">
            <p className="text-sm font-bold capitalize tracking-tight text-white">{value.name}</p>
            <div className="flex gap-1">
              {value.types.map(t => <TypeBadge key={t} type={t as PokemonType} size="sm" />)}
            </div>
          </div>
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-center rounded-b-2xl bg-zinc-800/0 py-1.5 opacity-0 transition group-hover:bg-zinc-800/60 group-hover:opacity-100">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Change</span>
          </div>
        </div>
      ) : (
        <button
          onClick={onOpenPicker}
          className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-zinc-700/60 bg-zinc-800/20 py-5 backdrop-blur-sm transition-all duration-200 hover:border-violet-500/60 hover:bg-violet-900/10 hover:shadow-[0_0_16px_rgb(124_58_237/0.12)]"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-dashed border-zinc-700 text-zinc-700">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="8" r="5" />
              <path d="M3 21v-1a9 9 0 0 1 18 0v1" />
            </svg>
          </div>
          <span className="text-xs text-zinc-600">Select {label}…</span>
        </button>
      )}
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

const ZERO_STAGES = { attack: 0, spAttack: 0, defense: 0, spDefense: 0 };

export function DamageCalculator() {
  const [attacker, setAttacker] = useState<PokemonSummary | null>(null);
  const [defender, setDefender] = useState<PokemonSummary | null>(null);
  const [move, setMove] = useState<MoveDetail | null>(null);
  const [result, setResult] = useState<{ dmg: DamageResult; move: MoveDetail } | null>(null);
  const [battleConfig, setBattleConfig] = useState<BattleConfig>(DEFAULT_BATTLE_CONFIG);

  const [loadingAttacker, setLoadingAttacker] = useState(false);
  const [loadingDefender, setLoadingDefender] = useState(false);
  const [loadingMove, setLoadingMove] = useState(false);

  const [attackerEvs, setAttackerEvs] = useState<Record<string, number>>({ attack: 0, spAttack: 0 });
  const [defenderEvs, setDefenderEvs] = useState<Record<string, number>>({ defense: 0, spDefense: 0 });

  const [attackerStages, setAttackerStages] = useState<Record<string, number>>({ attack: 0, spAttack: 0 });
  const [defenderStages, setDefenderStages] = useState<Record<string, number>>({ defense: 0, spDefense: 0 });

  const [attackerModalOpen, setAttackerModalOpen] = useState(false);
  const [defenderModalOpen, setDefenderModalOpen] = useState(false);
  const [hotkeyModalOpen, setHotkeyModalOpen] = useState(false);

  const [randomEnabled, setRandomEnabled] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const stored = sessionStorage.getItem(STORAGE_KEY);
    return stored === null ? true : stored === "true";
  });

  const { data: allNames = [], isLoading: namesLoading } = api.pokemon.listNames.useQuery(
    undefined,
    { staleTime: Infinity },
  );
  const utils = api.useUtils();
  const moveInputRef = useRef<HTMLInputElement>(null);
  const openMovePickerRef = useRef<(() => void) | null>(null);
  const attackerCardRef = useRef<HTMLDivElement>(null);
  const defenderCardRef = useRef<HTMLDivElement>(null);
  const levelInputRef = useRef<HTMLInputElement>(null);

  const attackerActiveKey = move
    ? (move.category === "physical" ? "attack" : move.category === "special" ? "spAttack" : undefined)
    : undefined;
  const defenderActiveKey = move
    ? (move.category === "physical" ? "defense" : move.category === "special" ? "spDefense" : undefined)
    : undefined;

  // Auto-calculate whenever any input changes
  useEffect(() => {
    if (!attacker || !defender || !move || !move.power) {
      setResult(null);
      return;
    }

    const level = battleConfig.level;
    const isPhysical = move.category === "physical";
    const isSpecial = move.category === "special";

    const attackKey = isPhysical ? "attack" : "spAttack";
    const defenseKey = isPhysical ? "defense" : "spDefense";

    let attackStat = isPhysical
      ? calcEffectiveStat(attacker.baseStats.attack, attackerEvs.attack ?? 0, level)
      : isSpecial
        ? calcEffectiveStat(attacker.baseStats.spAttack, attackerEvs.spAttack ?? 0, level)
        : 0;

    let defenseStat = isPhysical
      ? calcEffectiveStat(defender.baseStats.defense, defenderEvs.defense ?? 0, level)
      : isSpecial
        ? calcEffectiveStat(defender.baseStats.spDefense, defenderEvs.spDefense ?? 0, level)
        : 0;

    const atkStageMult = getStatStageMult(attackerStages[attackKey] ?? 0);
    const defStageMult = getStatStageMult(defenderStages[defenseKey] ?? 0);
    attackStat = Math.floor(attackStat * atkStageMult);
    defenseStat = Math.floor(defenseStat * defStageMult);

    if (battleConfig.attackerBurned && isPhysical) {
      attackStat = Math.floor(attackStat / 2);
    }

    const stab = attacker.types.includes(move.type as PokemonType);
    const te = getTypeEffectiveness(move.type as PokemonType, defender.types as PokemonType[]);
    const dmg = calculateDamage({
      level,
      power: move.power,
      attackStat,
      defenseStat,
      stab,
      typeEffectiveness: te,
      moveType: move.type as PokemonType,
      weather: battleConfig.weather,
      terrain: battleConfig.terrain,
      isCritical: battleConfig.isCritical,
    });

    const combinedStage = atkStageMult * defStageMult;
    if (combinedStage !== 1) dmg.stageMult = combinedStage;

    setResult({ dmg, move });
  }, [attacker, defender, move, battleConfig, attackerEvs, defenderEvs, attackerStages, defenderStages]);

  const randomizeBattle = useCallback(async () => {
    if (allNames.length === 0) return;

    const pick = () => allNames[Math.floor(Math.random() * allNames.length)]!;
    const attName = pick();
    let defName = pick();
    while (defName === attName && allNames.length > 1) defName = pick();

    setMove(null);
    setAttacker(null);
    setDefender(null);
    setLoadingAttacker(true);
    setLoadingDefender(true);
    setLoadingMove(true);

    const [att, def] = await Promise.all([
      utils.pokemon.search.fetch({ query: attName }),
      utils.pokemon.search.fetch({ query: defName }),
    ]);
    setAttacker(att);
    setDefender(def);
    setLoadingAttacker(false);
    setLoadingDefender(false);

    const candidates = [...att.moveNames].sort(() => Math.random() - 0.5);
    for (const moveName of candidates.slice(0, 10)) {
      try {
        const moveData = await utils.pokemon.getMove.fetch({ moveName });
        if (moveData.power !== null && moveData.power > 0 && moveData.category !== "status") {
          setMove(moveData);
          break;
        }
      } catch {
        // skip unavailable moves
      }
    }
    setLoadingMove(false);
  }, [allNames, utils]);

  const hasRandomized = useRef(false);
  useEffect(() => {
    if (randomEnabled && allNames.length > 0 && !hasRandomized.current) {
      hasRandomized.current = true;
      void randomizeBattle();
    }
  }, [randomEnabled, allNames.length, randomizeBattle]);

  useKeyboardShortcuts({
    onSearch: () => {
      if (!attacker) { setAttackerModalOpen(true); setKbState({ slot: null, panel: null, attribute: null }); }
      else if (!defender) { setDefenderModalOpen(true); setKbState({ slot: null, panel: null, attribute: null }); }
      else if (move) { openMovePickerRef.current?.(); }  // move selected → open the picker modal
      else { moveInputRef.current?.focus(); }             // no move → focus the inline search input
    },
  });

  // "/" opens the hotkey cheat sheet (fires even when an input is focused)
  useEffect(() => {
    function onSlash(e: KeyboardEvent) {
      if (e.key === "/" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        // Only suppress default (browser quick-find) when no input is focused, or when modal is already open
        const el = document.activeElement;
        const inInput = el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT");
        if (inInput && !hotkeyModalOpen) return; // let the user type "/" in inputs normally
        e.preventDefault();
        setHotkeyModalOpen(prev => !prev);
      }
    }
    window.addEventListener("keydown", onSlash);
    return () => window.removeEventListener("keydown", onSlash);
  }, [hotkeyModalOpen]);

  const [kbState, setKbState] = useCalculatorKeyboard({
    onOpenAttackerModal: () => { setAttackerModalOpen(true); setKbState({ slot: null, panel: null, attribute: null }); },
    onOpenDefenderModal: () => { setDefenderModalOpen(true); setKbState({ slot: null, panel: null, attribute: null }); },
    onChangeAttackerEv: (key, val) => setAttackerEvs(prev => ({ ...prev, [key]: val })),
    onChangeDefenderEv: (key, val) => setDefenderEvs(prev => ({ ...prev, [key]: val })),
    onChangeAttackerStage: (key, val) => setAttackerStages(prev => ({ ...prev, [key]: val })),
    onChangeDefenderStage: (key, val) => setDefenderStages(prev => ({ ...prev, [key]: val })),
    attackerEvs,
    defenderEvs,
    attackerStages,
    defenderStages,
  });

  const focusChain = useMemo<FocusChainEntry[]>(() => [
    { id: "attacker-card", getElement: () => attackerCardRef.current?.querySelector<HTMLElement>('[role="button"], button') ?? null },
    { id: "defender-card", getElement: () => defenderCardRef.current?.querySelector<HTMLElement>('[role="button"], button') ?? null },
    { id: "move-search", getElement: () => moveInputRef.current },
    { id: "level-input", getElement: () => levelInputRef.current },
  ], []);

  useFocusChain(focusChain);

  // Keyboard override: if user selected an attribute via keyboard, use it instead of move-derived key
  const effectiveAttackerKey = kbState.slot === "attacker" && kbState.attribute
    ? kbState.attribute
    : attackerActiveKey;
  const effectiveDefenderKey = kbState.slot === "defender" && kbState.attribute
    ? kbState.attribute
    : defenderActiveKey;

  const attackerEvStats: EvStat[] = attacker
    ? [
      { key: "attack", label: "Attack", base: attacker.baseStats.attack },
      { key: "spAttack", label: "Sp. Atk", base: attacker.baseStats.spAttack },
    ]
    : [];
  const defenderEvStats: EvStat[] = defender
    ? [
      { key: "defense", label: "Defense", base: defender.baseStats.defense },
      { key: "spDefense", label: "Sp. Def", base: defender.baseStats.spDefense },
    ]
    : [];

  const attackerStageStats = [
    { key: "attack", label: "Attack" },
    { key: "spAttack", label: "Sp. Atk" },
  ];
  const defenderStageStats = [
    { key: "defense", label: "Defense" },
    { key: "spDefense", label: "Sp. Def" },
  ];

  const showPokemonPanels = !!(attacker ?? loadingAttacker);

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(280px,1fr)_minmax(0,1.4fr)] lg:items-start lg:gap-4">

      {/* ── LEFT COLUMN ── */}
      <div className="flex flex-col gap-2.5">

        {/* Random battle toggle */}
        <div className={`relative flex items-center justify-between rounded-xl border border-zinc-700/50 bg-zinc-800/30 px-4 py-3 backdrop-blur-sm transition-opacity ${namesLoading ? "opacity-60" : "opacity-100"}`}>
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-zinc-200">Random Battle</span>
            <span className="text-xs text-zinc-600">
              {randomEnabled ? "Auto-loads a random matchup" : "Manual input mode"}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {randomEnabled && (
              <button
                onClick={() => void randomizeBattle()}
                disabled={allNames.length === 0}
                className="rounded-lg border border-zinc-700/60 px-3 py-1.5 text-xs font-medium text-zinc-500 transition-all duration-150 hover:border-violet-600/60 hover:bg-violet-950/20 hover:text-violet-400 disabled:opacity-40"
              >
                ↺ Reroll
              </button>
            )}
            <button
              role="switch"
              aria-checked={randomEnabled}
              onClick={() => {
                const next = !randomEnabled;
                setRandomEnabled(next);
                sessionStorage.setItem(STORAGE_KEY, String(next));
                if (next) void randomizeBattle();
              }}
              className={`relative h-6 w-11 rounded-full transition-colors duration-200 ${randomEnabled ? "bg-violet-600" : "bg-zinc-800 hover:bg-zinc-700"}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${randomEnabled ? "translate-x-5" : "translate-x-0"}`}
              />
            </button>
          </div>
        </div>

        {/* Pokemon pickers */}
        <div className="relative grid grid-cols-2 gap-2">
          <PokemonSlotCard
            label="Attacker"
            value={attacker}
            isLoading={loadingAttacker}
            onOpenPicker={() => { setAttackerModalOpen(true); setKbState({ slot: null, panel: null, attribute: null }); }}
            containerRef={attackerCardRef}
            kbHighlighted={kbState.slot === "attacker"}
          />
          <div className="pointer-events-none absolute top-1/2 left-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-700 bg-zinc-950 text-xs font-black tracking-tight text-zinc-500 shadow-lg">
              vs
            </div>
          </div>
          <PokemonSlotCard
            label="Defender"
            value={defender}
            isLoading={loadingDefender}
            onOpenPicker={() => { setDefenderModalOpen(true); setKbState({ slot: null, panel: null, attribute: null }); }}
            containerRef={defenderCardRef}
            kbHighlighted={kbState.slot === "defender"}
          />
        </div>

        {/* EV panels + Stat stage panels */}
        {showPokemonPanels && (
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1.5">
              {attacker && !loadingAttacker ? (
                <>
                  <EvPanel
                    stats={attackerEvStats}
                    evs={attackerEvs}
                    level={battleConfig.level}
                    activeKey={effectiveAttackerKey}
                    onChange={(key, val) => setAttackerEvs(prev => ({ ...prev, [key]: val }))}
                    kbFocused={kbState.slot === "attacker" && kbState.panel === "ev"}
                  />
                  <StatStagePanel
                    stats={attackerStageStats}
                    stages={attackerStages}
                    activeKey={effectiveAttackerKey}
                    onChange={(key, val) => setAttackerStages(prev => ({ ...prev, [key]: val }))}
                    kbFocused={kbState.slot === "attacker" && kbState.panel === "stage"}
                  />
                </>
              ) : (
                <div className="relative overflow-hidden rounded-xl border border-zinc-700/40 bg-zinc-800/20 px-3 py-2.5">
                  <div className="shimmer absolute inset-0" />
                  <div className="flex flex-col gap-3">
                    <SkeletonBlock className="h-2.5 w-8" />
                    <SkeletonBlock className="h-6 w-full" />
                    <SkeletonBlock className="h-6 w-full" />
                  </div>
                </div>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              {defender && !loadingDefender ? (
                <>
                  <EvPanel
                    stats={defenderEvStats}
                    evs={defenderEvs}
                    level={battleConfig.level}
                    activeKey={effectiveDefenderKey}
                    onChange={(key, val) => setDefenderEvs(prev => ({ ...prev, [key]: val }))}
                    kbFocused={kbState.slot === "defender" && kbState.panel === "ev"}
                  />
                  <StatStagePanel
                    stats={defenderStageStats}
                    stages={defenderStages}
                    activeKey={effectiveDefenderKey}
                    onChange={(key, val) => setDefenderStages(prev => ({ ...prev, [key]: val }))}
                    kbFocused={kbState.slot === "defender" && kbState.panel === "stage"}
                  />
                </>
              ) : (
                <div className="relative overflow-hidden rounded-xl border border-zinc-700/40 bg-zinc-800/20 px-3 py-2.5">
                  <div className="shimmer absolute inset-0" />
                  <div className="flex flex-col gap-3">
                    <SkeletonBlock className="h-2.5 w-8" />
                    <SkeletonBlock className="h-6 w-full" />
                    <SkeletonBlock className="h-6 w-full" />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* ── RIGHT COLUMN ── */}
      <div className="flex h-full justify-end item-end flex-col gap-3.5">

        <div className="h-full p-4 text-end">
          {/* Hotkey hint — full cheat sheet opens with "/" */}
          <div className="flex items-center justify-end gap-1.5 text-[11px] text-zinc-700"
          >
            <kbd className="rounded bg-zinc-900 px-1.5 py-0.5 font-mono text-zinc-500">/</kbd>
            <span className="text-zinc-400">Keyboard shortcuts</span>
          </div>
        </div>

        {/* Move section — z-10 keeps dropdown above anything below */}
        <MoveFuzzySearch
          moveNames={attacker?.moveNames ?? []}
          value={move}
          isLoadingMove={loadingMove}
          onSelect={m => setMove(m)}
          onClear={() => setMove(null)}
          inputRef={moveInputRef}
          openModalRef={openMovePickerRef}
          attackerSprite={attacker?.sprite}
          attackerName={attacker?.name}
        />

        {/* Battle config — at top of column */}
        <BattleConfigPanel
          config={battleConfig}
          onChange={setBattleConfig}
          levelInputRef={levelInputRef}
        />

      </div>

      {/* ── RESULT — spans both columns ── */}
      {result && attacker && defender && (
        <div className="lg:col-span-2">
          <DamageResultCard
            result={result.dmg}
            moveName={result.move.name}
            moveType={result.move.type}
            attackerName={attacker.name}
            defenderName={defender.name}
            defenderBaseHp={defender.baseStats.hp}
          />
        </div>
      )}

      {/* Modals */}
      {attackerModalOpen && (
        <PokemonPickerModal
          label="Attacker"
          current={attacker}
          onSelect={p => {
            setAttacker(p);
            setMove(null);
            setAttackerEvs({ attack: 0, spAttack: 0 });
            setAttackerStages({ ...ZERO_STAGES });
            setAttackerModalOpen(false);
          }}
          onClose={() => setAttackerModalOpen(false)}
        />
      )}
      {defenderModalOpen && (
        <PokemonPickerModal
          label="Defender"
          current={defender}
          onSelect={p => {
            setDefender(p);
            setDefenderEvs({ defense: 0, spDefense: 0 });
            setDefenderStages({ ...ZERO_STAGES });
            setDefenderModalOpen(false);
          }}
          onClose={() => setDefenderModalOpen(false)}
        />
      )}
      {hotkeyModalOpen && (
        <HotkeyModal onClose={() => setHotkeyModalOpen(false)} />
      )}
    </div>
  );
}
