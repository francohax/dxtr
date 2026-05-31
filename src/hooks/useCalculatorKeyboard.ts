import { useState, useEffect, useRef } from "react";
import { type Weather, type Terrain } from "~/lib/types";

export type FocusSlot      = "attacker" | "defender" | null;
export type FocusPanel     = "ev" | "stage" | null;
export type FocusAttribute = "attack" | "spAttack" | "defense" | "spDefense" | null;

export interface CalcKbState {
  slot:      FocusSlot;
  panel:     FocusPanel;
  attribute: FocusAttribute;
}

export interface UseCalculatorKeyboardOptions {
  onOpenAttackerModal:   () => void;
  onOpenDefenderModal:   () => void;
  onChangeAttackerEv:    (key: string, value: number) => void;
  onChangeDefenderEv:    (key: string, value: number) => void;
  onChangeAttackerStage: (key: string, value: number) => void;
  onChangeDefenderStage: (key: string, value: number) => void;
  attackerEvs:    Record<string, number>;
  defenderEvs:    Record<string, number>;
  attackerStages: Record<string, number>;
  defenderStages: Record<string, number>;
  moveCategory?:  "physical" | "special" | "status";
  // Battle config shortcuts
  onFocusWeather?:   () => void;
  onFocusTerrain?:   () => void;
  onSelectWeather?:  (weather: Weather) => void;
  onSelectTerrain?:  (terrain: Terrain) => void;
  onToggleCrit?:     () => void;
  onToggleBurn?:     () => void;
}

const WEATHER_ORDER: Weather[] = ["sun", "rain", "sandstorm", "hail"];
const TERRAIN_ORDER: Terrain[] = ["electric", "grassy", "psychic", "misty"];

function isInputFocused(): boolean {
  const el = document.activeElement;
  if (!el) return false;
  return (
    el.tagName === "INPUT"    ||
    el.tagName === "SELECT"   ||
    el.tagName === "TEXTAREA" ||
    (el as HTMLElement).isContentEditable
  );
}

const EMPTY: CalcKbState = { slot: null, panel: null, attribute: null };

function autoAttribute(slot: FocusSlot, category?: string): FocusAttribute {
  if (!slot || !category) return null;
  if (category === "physical") return slot === "attacker" ? "attack" : "defense";
  if (category === "special")  return slot === "attacker" ? "spAttack" : "spDefense";
  return null;
}

export function useCalculatorKeyboard(
  options: UseCalculatorKeyboardOptions,
): [CalcKbState, React.Dispatch<React.SetStateAction<CalcKbState>>] {
  const [state, setState] = useState<CalcKbState>(EMPTY);

  // Refs keep handler always up-to-date without resubscribing
  const stateRef = useRef(state);
  stateRef.current = state;
  const optsRef = useRef(options);
  optsRef.current = options;
  const awaitingBattleRef = useRef<"weather" | "terrain" | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const s    = stateRef.current;
      const opts = optsRef.current;
      const inInput = isInputFocused();

      // Escape always clears state and blurs
      if (e.key === "Escape") {
        awaitingBattleRef.current = null;
        setState(EMPTY);
        (document.activeElement as HTMLElement | null)?.blur();
        return;
      }

      // Awaiting weather/terrain 1–4 selection — takes priority over digit-slot shortcuts
      const awaiting = awaitingBattleRef.current;
      if (awaiting) {
        const idx = parseInt(e.key) - 1;
        if (idx >= 0 && idx <= 3 && !inInput) {
          e.preventDefault();
          awaitingBattleRef.current = null;
          if (awaiting === "weather") {
            opts.onSelectWeather?.(WEATHER_ORDER[idx]!);
          } else {
            opts.onSelectTerrain?.(TERRAIN_ORDER[idx]!);
          }
          return;
        }
        awaitingBattleRef.current = null; // any other key cancels
      }

      if (inInput) return;

      // Battle config shortcuts (w/t/c/v — global, no slot required)
      if (e.key === "w") { e.preventDefault(); awaitingBattleRef.current = "weather"; opts.onFocusWeather?.(); return; }
      if (e.key === "t") { e.preventDefault(); awaitingBattleRef.current = "terrain"; opts.onFocusTerrain?.(); return; }
      if (e.key === "c") { e.preventDefault(); opts.onToggleCrit?.(); return; }
      if (e.key === "v") { e.preventDefault(); opts.onToggleBurn?.(); return; }

      // Slot selection
      if (e.code === "Digit1") { setState({ slot: "attacker", panel: null, attribute: null }); return; }
      if (e.code === "Digit2") { setState({ slot: "defender", panel: null, attribute: null }); return; }

      // Open picker modal (requires slot)
      if (e.key === "Enter" && s.slot !== null) {
        e.preventDefault();
        if (s.slot === "attacker") opts.onOpenAttackerModal();
        else                       opts.onOpenDefenderModal();
        return;
      }

      // Panel selection (requires slot) — auto-selects attribute based on move category
      if (s.slot !== null) {
        if (e.code === "KeyE") { e.preventDefault(); setState(prev => ({ ...prev, panel: "ev",    attribute: autoAttribute(s.slot, opts.moveCategory) })); return; }
        if (e.code === "KeyB") { e.preventDefault(); setState(prev => ({ ...prev, panel: "stage", attribute: autoAttribute(s.slot, opts.moveCategory) })); return; }
      }

      // Attribute selection (requires panel) — a/s keys + ArrowUp/Down
      // ArrowUp/Down are intercepted here first so they don't reach the value-change block below
      if (s.panel !== null && s.slot !== null) {
        const phys = s.slot === "attacker" ? "attack"   : "defense";
        const spec = s.slot === "attacker" ? "spAttack" : "spDefense";
        if (e.code === "KeyA" || e.key === "ArrowUp") {
          e.preventDefault();
          setState(prev => ({ ...prev, attribute: phys }));
          return;
        }
        if (e.code === "KeyS" || e.key === "ArrowDown") {
          e.preventDefault();
          setState(prev => ({ ...prev, attribute: spec }));
          return;
        }
      }

      // Value changes via ArrowRight/Left and +/- (requires attribute + panel + slot)
      if (s.attribute !== null && s.panel !== null && s.slot !== null) {
        const isInc = e.key === "+" || e.key === "=" || e.key === "ArrowRight";
        const isDec = e.key === "-" || e.key === "ArrowLeft";
        if (!isInc && !isDec) return;
        e.preventDefault();

        if (s.panel === "ev") {
          const evs = s.slot === "attacker" ? opts.attackerEvs    : opts.defenderEvs;
          const fn  = s.slot === "attacker" ? opts.onChangeAttackerEv : opts.onChangeDefenderEv;
          const next = Math.max(0, Math.min(252, (evs[s.attribute] ?? 0) + (isInc ? 4 : -4)));
          fn(s.attribute, next);
        } else {
          const stages = s.slot === "attacker" ? opts.attackerStages    : opts.defenderStages;
          const fn     = s.slot === "attacker" ? opts.onChangeAttackerStage : opts.onChangeDefenderStage;
          const next   = Math.max(-6, Math.min(6, (stages[s.attribute] ?? 0) + (isInc ? 1 : -1)));
          fn(s.attribute, next);
        }
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []); // empty — reads live values via refs

  return [state, setState];
}
