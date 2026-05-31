# Calculator UX Phase 2: Keyboard Nav, HP Bar, Enhanced Search

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a keyboard-driven state machine for full calculator navigation, a configurable tab-order system, a defender HP bar in the result card, richer move/Pokemon search rows with sprites and stats, and arrow-key navigation across all search dropdowns.

**Architecture:** Four new hooks (`useCalculatorKeyboard`, `useFocusChain`, `useListKeyboard`, `useMovePrefetch`) own cross-cutting behaviour. Component props are extended minimally — `kbFocused`, `containerRef`, `levelInputRef` — to pass keyboard state and refs downward. The HP bar reuses data already calculated in `DamageResultCard`. Move enrichment uses React Query / tRPC client-side prefetch (no schema change needed). Pokemon search rows are enriched by extending `listSummaries` to include `sprite` and `id`.

**Tech Stack:** Next.js 15 App Router · React 19 · tRPC 11 · Prisma 6 · Tailwind CSS v4 · TypeScript

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `src/hooks/useCalculatorKeyboard.ts` | Keyboard state machine (slot/panel/attribute focus, value changes) |
| Create | `src/hooks/useFocusChain.ts` | Tab-order manager — register an ordered list of element getters |
| Create | `src/hooks/useListKeyboard.ts` | Arrow-key navigation index for any dropdown list |
| Create | `src/hooks/useMovePrefetch.ts` | Prefetch move summaries (type/category/power) via tRPC cache |
| Modify | `src/app/calculator/_components/DamageCalculator.tsx` | Wire all four hooks; forward refs; update panel props |
| Modify | `src/app/calculator/_components/DamageResult.tsx` | Add HP bar between modifier chain and damage numbers |
| Modify | `src/app/calculator/_components/MoveFuzzySearch.tsx` | Arrow nav on inline dropdown; enhanced rows in MovePickerModal |
| Modify | `src/app/calculator/_components/PokemonPickerModal.tsx` | Sprite rows in search dropdown; arrow-key navigation |
| Modify | `src/app/calculator/_components/BattleConfigPanel.tsx` | Accept `levelInputRef` prop for focus chain |
| Modify | `src/server/api/routers/pokemon.ts` | Add `id` + `sprite` to `listSummaries` |

---

### Task 1: `useCalculatorKeyboard` — keyboard state machine

**Files:**
- Create: `src/hooks/useCalculatorKeyboard.ts`

The hook owns the entire keyboard navigation state for the calculator page. All keys skip when a native input/select/textarea/contenteditable is focused, except Escape which always runs.

**Key map:**

| Key | Condition | Action |
|-----|-----------|--------|
| `Escape` | always | clear all state, blur active element |
| `1` | not in input | focus attacker slot |
| `2` | not in input | focus defender slot |
| `Enter` | slot active, not in input | open picker modal for slot |
| `e` | slot active, not in input | activate EV panel |
| `b` | slot active, not in input | activate Stages panel |
| `a` | panel active, not in input | select physical attribute (attack / defense) |
| `s` | panel active, not in input | select special attribute (spAttack / spDefense) |
| `ArrowUp` | panel active, not in input | select physical attribute (attack / defense) |
| `ArrowDown` | panel active, not in input | select special attribute (spAttack / spDefense) |
| `+` / `=` / `ArrowRight` | attribute active, ev panel | increment EV +4, clamp 0–252 |
| `-` / `ArrowLeft` | attribute active, ev panel | decrement EV −4, clamp 0–252 |
| `+` / `=` / `ArrowRight` | attribute active, stage panel | increment stage +1, clamp −6–6 |
| `-` / `ArrowLeft` | attribute active, stage panel | decrement stage −1, clamp −6–6 |

- [ ] **Step 1: Write the hook file**

```typescript
// src/hooks/useCalculatorKeyboard.ts
import { useState, useEffect, useRef } from "react";

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
}

function isInputFocused(): boolean {
  const el = document.activeElement;
  if (!el) return false;
  return (
    el.tagName === "INPUT" ||
    el.tagName === "SELECT" ||
    el.tagName === "TEXTAREA" ||
    (el as HTMLElement).isContentEditable
  );
}

const EMPTY: CalcKbState = { slot: null, panel: null, attribute: null };

export function useCalculatorKeyboard(
  options: UseCalculatorKeyboardOptions,
): [CalcKbState, React.Dispatch<React.SetStateAction<CalcKbState>>] {
  const [state, setState] = useState<CalcKbState>(EMPTY);

  // Refs keep handler always up-to-date without resubscribing
  const stateRef = useRef(state);
  stateRef.current = state;
  const optsRef = useRef(options);
  optsRef.current = options;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const s    = stateRef.current;
      const opts = optsRef.current;
      const inInput = isInputFocused();

      // Escape always fires
      if (e.key === "Escape") {
        setState(EMPTY);
        (document.activeElement as HTMLElement | null)?.blur();
        return;
      }

      if (inInput) return;

      // Slot selection
      if (e.code === "Digit1") { setState({ slot: "attacker", panel: null, attribute: null }); return; }
      if (e.code === "Digit2") { setState({ slot: "defender", panel: null, attribute: null }); return; }

      // Open picker modal
      if (e.key === "Enter" && s.slot !== null) {
        e.preventDefault();
        if (s.slot === "attacker") opts.onOpenAttackerModal();
        else                       opts.onOpenDefenderModal();
        return;
      }

      // Panel selection (requires slot)
      if (s.slot !== null) {
        if (e.code === "KeyE") { e.preventDefault(); setState(prev => ({ ...prev, panel: "ev",    attribute: null })); return; }
        if (e.code === "KeyB") { e.preventDefault(); setState(prev => ({ ...prev, panel: "stage", attribute: null })); return; }
      }

      // Attribute selection (requires panel) — a/s names + ArrowUp/Down switches
      // ArrowUp/Down are checked here first so they never fall through to the value-change block below
      if (s.panel !== null && s.slot !== null) {
        const phys = s.slot === "attacker" ? "attack"   : "defense";
        const spec = s.slot === "attacker" ? "spAttack" : "spDefense";
        if (e.code === "KeyA" || e.key === "ArrowUp") {
          e.preventDefault();
          setState(prev => ({ ...prev, attribute: phys as FocusAttribute }));
          return;
        }
        if (e.code === "KeyS" || e.key === "ArrowDown") {
          e.preventDefault();
          setState(prev => ({ ...prev, attribute: spec as FocusAttribute }));
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
          const evs  = s.slot === "attacker" ? opts.attackerEvs    : opts.defenderEvs;
          const fn   = s.slot === "attacker" ? opts.onChangeAttackerEv : opts.onChangeDefenderEv;
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
```

- [ ] **Step 2: Run typecheck**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useCalculatorKeyboard.ts
git commit -m "feat(hooks): add useCalculatorKeyboard state machine"
```

---

### Task 2: `useFocusChain` — configurable Tab order

**Files:**
- Create: `src/hooks/useFocusChain.ts`

The hook intercepts Tab/Shift+Tab and advances through a caller-supplied ordered list of element getters. Any element not in the chain is unaffected (browser handles Tab normally).

- [ ] **Step 1: Write the hook file**

```typescript
// src/hooks/useFocusChain.ts
import { useEffect, useRef } from "react";

export interface FocusChainEntry {
  id: string;
  getElement: () => HTMLElement | null;
}

export function useFocusChain(entries: FocusChainEntry[]) {
  const entriesRef = useRef(entries);
  entriesRef.current = entries;

  useEffect(() => {
    function onTab(e: KeyboardEvent) {
      if (e.key !== "Tab") return;
      const els = entriesRef.current
        .map(en => en.getElement())
        .filter((el): el is HTMLElement => {
          if (!el) return false;
          const inp = el as HTMLInputElement;
          return !inp.disabled;
        });
      const current = document.activeElement as HTMLElement;
      const idx = els.indexOf(current);
      if (idx === -1) return; // not our chain — let browser handle
      e.preventDefault();
      const next = e.shiftKey
        ? els[(idx - 1 + els.length) % els.length]!
        : els[(idx + 1) % els.length]!;
      next.focus();
    }
    window.addEventListener("keydown", onTab);
    return () => window.removeEventListener("keydown", onTab);
  }, []); // empty — reads entries live via ref
}
```

- [ ] **Step 2: Run typecheck**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useFocusChain.ts
git commit -m "feat(hooks): add useFocusChain tab-order manager"
```

---

### Task 3: `useListKeyboard` — arrow-key navigation in dropdowns

**Files:**
- Create: `src/hooks/useListKeyboard.ts`

Tracks a `activeIndex` (-1 = nothing highlighted) within a list. Caller provides `count` (list length) and `onConfirm(index)`. ArrowDown/Up moves index; Enter confirms; Escape resets.

- [ ] **Step 1: Write the hook file**

```typescript
// src/hooks/useListKeyboard.ts
import { useState, useEffect, useRef } from "react";

export interface UseListKeyboardOptions {
  count:      number;
  onConfirm:  (index: number) => void;
  onEscape?:  () => void;
  enabled?:   boolean;
}

export function useListKeyboard({ count, onConfirm, onEscape, enabled = true }: UseListKeyboardOptions) {
  const [activeIndex, setActiveIndex] = useState(-1);

  // Reset whenever the list length changes (new query result)
  useEffect(() => { setActiveIndex(-1); }, [count]);

  const activeRef = useRef(activeIndex);
  activeRef.current = activeIndex;
  const cbRef = useRef({ onConfirm, onEscape });
  cbRef.current = { onConfirm, onEscape };

  useEffect(() => {
    if (!enabled) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex(prev => (count > 0 ? Math.min(prev + 1, count - 1) : -1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex(prev => Math.max(prev - 1, -1));
        return;
      }
      if (e.key === "Enter" && activeRef.current >= 0) {
        e.preventDefault();
        cbRef.current.onConfirm(activeRef.current);
        return;
      }
      if (e.key === "Escape") {
        setActiveIndex(-1);
        cbRef.current.onEscape?.();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [count, enabled]);

  return { activeIndex, setActiveIndex };
}
```

- [ ] **Step 2: Run typecheck**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useListKeyboard.ts
git commit -m "feat(hooks): add useListKeyboard for dropdown arrow navigation"
```

---

### Task 4: `useMovePrefetch` — background move summary fetching

**Files:**
- Create: `src/hooks/useMovePrefetch.ts`

When a move picker opens, we need to display type/category/power for each row without loading all 900+ moves up front. This hook fires `getMove` for the first 24 names via the tRPC React Query cache (already revalidates via Next.js HTTP cache at the server layer), stores partial results as they arrive, and cancels on unmount.

- [ ] **Step 1: Write the hook file**

```typescript
// src/hooks/useMovePrefetch.ts
import { useState, useEffect, useRef } from "react";
import { api } from "~/trpc/react";
import { type PokemonType, type MoveCategory } from "~/lib/types";

export interface MoveSummary {
  type:     PokemonType;
  category: MoveCategory;
  power:    number | null;
}

export function useMovePrefetch(moveNames: string[], enabled: boolean): Map<string, MoveSummary> {
  const [summaries, setSummaries] = useState<Map<string, MoveSummary>>(new Map());
  const utils = api.useUtils();
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!enabled || moveNames.length === 0) {
      setSummaries(new Map());
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setSummaries(new Map());

    const toFetch = moveNames.slice(0, 24);
    toFetch.forEach(name => {
      utils.pokemon.getMove.fetch({ moveName: name })
        .then(move => {
          if (controller.signal.aborted) return;
          setSummaries(prev => {
            const next = new Map(prev);
            next.set(name, { type: move.type, category: move.category, power: move.power });
            return next;
          });
        })
        .catch(() => { /* skip unavailable moves silently */ });
    });

    return () => { controller.abort(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moveNames, enabled]);

  return summaries;
}
```

- [ ] **Step 2: Run typecheck**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useMovePrefetch.ts
git commit -m "feat(hooks): add useMovePrefetch for background move detail loading"
```

---

### Task 5: Extend `listSummaries` to include sprite and pokeApiId

**Files:**
- Modify: `src/server/api/routers/pokemon.ts`

The Pokemon picker search results currently only know `name` and `types`. Adding `id` (the pokeApiId) and `sprite` allows the modal to render a sprite per search result row.

- [ ] **Step 1: Update the `listSummaries` query**

In `src/server/api/routers/pokemon.ts`, change the `listSummaries` procedure:

```typescript
// Before:
listSummaries: publicProcedure.query(async ({ ctx }) => {
  return ctx.db.cachedPokemon.findMany({
    select: { name: true, types: true },
    orderBy: { id: "asc" },
  });
}),

// After:
listSummaries: publicProcedure.query(async ({ ctx }) => {
  return ctx.db.cachedPokemon.findMany({
    select: { id: true, name: true, types: true, sprite: true },
    orderBy: { id: "asc" },
  });
}),
```

No schema migration needed — `id` and `sprite` already exist on `CachedPokemon`.

- [ ] **Step 2: Run typecheck**

```bash
npx tsc --noEmit
```

Expected: no errors. The tRPC inferred return type propagates to the client automatically.

- [ ] **Step 3: Commit**

```bash
git add src/server/api/routers/pokemon.ts
git commit -m "feat(api): include id and sprite in listSummaries for picker enrichment"
```

---

### Task 6: HP bar in `DamageResultCard`

**Files:**
- Modify: `src/app/calculator/_components/DamageResult.tsx`

Add a horizontal HP bar section between the modifier chain and the damage numbers. The bar shows three segments:

```
[── remaining after max dmg ──][── uncertain ──][── certain dmg ──]
     green/yellow/red               red/40%          red/70%
```

- `certain_dmg_pct    = min / defHp × 100`
- `uncertain_pct      = (max − min) / defHp × 100`
- `remaining_pct      = max(0, 100 − max_dmg_pct)`
- `remain_colour`     = green >50%, yellow >25%, red otherwise

Insert this block into `DamageResultCard` after the modifier chain `<div>` and before the `{/* Divider */}` line:

- [ ] **Step 1: Read the current file to confirm insertion point**

Read `src/app/calculator/_components/DamageResult.tsx` lines 60–125 (already done above). Insertion is after line 115 (`</div>` closing the modifier chain div) and before line 119 (`{/* Divider */}`).

- [ ] **Step 2: Add the HP bar section**

Replace the content of `DamageResultCard` function — specifically replace the section between the modifier chain closing `</div>` and the `{/* Divider */}` comment — with:

```tsx
        </div>{/* end modifier chain */}

        {/* HP bar */}
        {(() => {
          const minPct     = Math.min(100, (result.min / defHp) * 100);
          const maxPct     = Math.min(100, (result.max / defHp) * 100);
          const remainPct  = Math.max(0, 100 - maxPct);
          const rangePct   = maxPct - minPct;
          const remainColour =
            remainPct > 50 ? "bg-green-500" :
            remainPct > 25 ? "bg-yellow-400" :
            remainPct > 0  ? "bg-red-400"   : "";
          const remainHp = Math.max(0, defHp - result.max);
          return (
            <div className="flex flex-col gap-1.5">
              <div className="relative h-3 w-full overflow-hidden rounded-full bg-zinc-800/70">
                {/* Remaining HP after worst-case damage */}
                <div
                  className={`absolute inset-y-0 left-0 transition-all duration-500 ${remainColour}`}
                  style={{ width: `${remainPct}%` }}
                />
                {/* Uncertain zone (min → max damage) */}
                <div
                  className="absolute inset-y-0 bg-red-500/40 transition-all duration-500"
                  style={{ left: `${remainPct}%`, width: `${rangePct}%` }}
                />
                {/* Certain damage (always dealt = min damage) */}
                <div
                  className="absolute inset-y-0 right-0 bg-red-600/70 transition-all duration-500"
                  style={{ width: `${minPct}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] tabular-nums text-zinc-600">
                <span>{remainHp} HP remaining</span>
                <span>{Math.round((result.max / defHp) * 100)}% max damage</span>
              </div>
            </div>
          );
        })()}
```

The full updated `DamageResultCard` function body will look like:

```tsx
export function DamageResultCard({
  result,
  moveName,
  moveType,
  attackerName,
  defenderName,
  defenderBaseHp,
}: DamageResultCardProps) {
  const effectLabel = /* ... unchanged ... */;
  const effectColour = /* ... unchanged ... */;

  const defHp = defenderHpAtL50(defenderBaseHp);
  const ohkoOdds = calcOhkoOdds(result.modifiedBeforeRandom, defHp);
  const ohkoPercent = Math.round(ohkoOdds * 100);
  const ohkoRolls = Math.round(ohkoOdds * 16);

  const ohkoLabel = /* ... unchanged ... */;
  const ohkoColour = /* ... unchanged ... */;

  return (
    <div className="animate-fade-in relative overflow-hidden rounded-2xl border border-zinc-700/50 bg-zinc-800/30 px-6 py-5 backdrop-blur-sm">
      {/* Move-type top accent — unchanged */}
      {moveType && ( /* ... unchanged ... */ )}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-8">

        {/* Left zone: header + modifier chain */}
        <div className="flex flex-1 flex-col gap-3">
          <p className="text-sm text-zinc-400">
            <span className="font-semibold capitalize text-white">{attackerName}</span>
            {" uses "}
            <span className="font-semibold capitalize text-violet-300">{moveName.replace(/-/g, " ")}</span>
            {" on "}
            <span className="font-semibold capitalize text-white">{defenderName}</span>
          </p>

          {/* Modifier chain — unchanged */}
          <div className="flex flex-wrap items-center gap-1.5">
            {/* ... all existing ModifierPill items ... */}
          </div>

          {/* HP bar — NEW */}
          {(() => {
            const minPct    = Math.min(100, (result.min / defHp) * 100);
            const maxPct    = Math.min(100, (result.max / defHp) * 100);
            const remainPct = Math.max(0, 100 - maxPct);
            const rangePct  = maxPct - minPct;
            const remainColour =
              remainPct > 50 ? "bg-green-500" :
              remainPct > 25 ? "bg-yellow-400" :
              remainPct > 0  ? "bg-red-400"   : "";
            const remainHp = Math.max(0, defHp - result.max);
            return (
              <div className="flex flex-col gap-1.5">
                <div className="relative h-3 w-full overflow-hidden rounded-full bg-zinc-800/70">
                  <div className={`absolute inset-y-0 left-0 transition-all duration-500 ${remainColour}`} style={{ width: `${remainPct}%` }} />
                  <div className="absolute inset-y-0 bg-red-500/40 transition-all duration-500" style={{ left: `${remainPct}%`, width: `${rangePct}%` }} />
                  <div className="absolute inset-y-0 right-0 bg-red-600/70 transition-all duration-500" style={{ width: `${minPct}%` }} />
                </div>
                <div className="flex justify-between text-[10px] tabular-nums text-zinc-600">
                  <span>{remainHp} HP remaining</span>
                  <span>{Math.round((result.max / defHp) * 100)}% max damage</span>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Divider — unchanged */}
        <div className="hidden w-px self-stretch bg-zinc-700/50 lg:block" />

        {/* Right zone: damage range + OHKO — unchanged */}
        {/* ... */}
      </div>
    </div>
  );
}
```

The actual edit replaces only the section after the modifier chain closing `</div>` and before `{/* Divider */}`.

- [ ] **Step 3: Run typecheck**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/calculator/_components/DamageResult.tsx
git commit -m "feat(calc): add HP bar visualisation to damage result card"
```

---

### Task 7: Enhanced Pokemon picker search rows

**Files:**
- Modify: `src/app/calculator/_components/PokemonPickerModal.tsx`

The `listSummaries` query now returns `{id, name, types, sprite}[]`. Update `matches` to keep the full summary object and render a sprite + type badges per dropdown row.

- [ ] **Step 1: Update the `matches` memo in `PokemonPickerModal`**

```typescript
// Before — maps to string[]
const matches = useMemo(() => {
  const hasQuery = query.length >= 2;
  const hasFilter = typeFilters.length > 0;
  if (!hasQuery && !hasFilter) return [];
  const q = query.toLowerCase().replace(/\s/g, "-");
  return allSummaries
    .filter((s) => {
      const nameMatch = !hasQuery || s.name.includes(q);
      const typeMatch = !hasFilter || typeFilters.every((f) => s.types.includes(f));
      return nameMatch && typeMatch;
    })
    .slice(0, 20)
    .map((s) => s.name);
}, [query, allSummaries, typeFilters]);

// After — maps to {name, sprite, types}[]
const matches = useMemo(() => {
  const hasQuery = query.length >= 2;
  const hasFilter = typeFilters.length > 0;
  if (!hasQuery && !hasFilter) return [];
  const q = query.toLowerCase().replace(/\s/g, "-");
  return allSummaries
    .filter((s) => {
      const nameMatch = !hasQuery || s.name.includes(q);
      const typeMatch = !hasFilter || typeFilters.every((f) => s.types.includes(f));
      return nameMatch && typeMatch;
    })
    .slice(0, 20);
}, [query, allSummaries, typeFilters]);
```

- [ ] **Step 2: Update the dropdown list to render enriched rows**

Replace the `<ul>` dropdown block (where `{matches.map((name) => ...)}` renders just names) with:

```tsx
{matches.length > 0 && !chosen && (
  <ul className="absolute top-full z-10 mt-1 max-h-52 w-full overflow-y-auto rounded-xl border border-zinc-700 bg-zinc-900 py-1 shadow-2xl">
    {matches.map((s, i) => (
      <li key={s.name}>
        <button
          onClick={() => pick(s.name)}
          className={`flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-sm transition hover:bg-zinc-800 ${
            i === activeIndex ? "bg-zinc-800" : ""
          }`}
        >
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-zinc-800/80">
            <Image
              src={s.sprite}
              alt={s.name}
              width={24}
              height={24}
              unoptimized
              className="drop-shadow-sm"
            />
          </div>
          <span className="flex-1 capitalize text-zinc-300">{s.name.replace(/-/g, " ")}</span>
          <div className="flex gap-1">
            {(s.types as PokemonType[]).map(t => <TypeBadge key={t} type={t} size="sm" />)}
          </div>
        </button>
      </li>
    ))}
  </ul>
)}
```

Note: `activeIndex` is introduced in Task 8. For now, use `activeIndex` imported from `useListKeyboard` (wire it up in Task 8). As a placeholder in this task, just apply it without the conditional class — add `className="flex w-full ..."` without the `activeIndex` check, then add it in Task 8.

- [ ] **Step 3: Update `pick()` to use the new object structure**

The `pick` function currently takes a string name. Update calls so `pick` receives a name:
```typescript
function pick(name: string) {
  setChosen(name);
  setQuery(name.replace(/-/g, " "));
}
```
This is unchanged — it still takes a name string. `s.name` is passed in the `onClick`.

- [ ] **Step 4: Run typecheck**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/calculator/_components/PokemonPickerModal.tsx
git commit -m "feat(calc): enrich pokemon picker search rows with sprites and type badges"
```

---

### Task 8: Arrow-key navigation in all search dropdowns

**Files:**
- Modify: `src/app/calculator/_components/PokemonPickerModal.tsx`
- Modify: `src/app/calculator/_components/MoveFuzzySearch.tsx` (affects both `MoveFuzzySearch` and `MovePickerModal`)

Apply `useListKeyboard` to all three search lists. The `activeIndex` drives a `bg-zinc-800` highlight class on the focused row.

Also add attacker sprite + enhanced move rows (type badge + power/category) to `MovePickerModal`.

- [ ] **Step 1: Apply `useListKeyboard` to `PokemonPickerModal`**

Add to `PokemonPickerModal.tsx`:

```typescript
import { useListKeyboard } from "~/hooks/useListKeyboard";

// Inside PokemonPickerModal component, after matches memo:
const { activeIndex } = useListKeyboard({
  count: matches.length,
  onConfirm: (i) => { const s = matches[i]; if (s) pick(s.name); },
  onEscape: onClose,
  enabled: matches.length > 0 && !chosen,
});
```

Update the dropdown list row class (from Task 7 Step 2 — add the `activeIndex` conditional):
```tsx
className={`flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-sm transition hover:bg-zinc-800 ${
  i === activeIndex ? "bg-zinc-800" : ""
}`}
```

- [ ] **Step 2: Apply `useListKeyboard` to `MoveFuzzySearch` inline dropdown**

In `MoveFuzzySearch.tsx`, inside the `MoveFuzzySearch` component (the empty-state inline search):

```typescript
import { useListKeyboard } from "~/hooks/useListKeyboard";

// After filtered memo:
const { activeIndex: inlineActiveIndex } = useListKeyboard({
  count: filtered.length,
  onConfirm: (i) => { const name = filtered[i]; if (name) void handleInlineSelect(name); },
  enabled: open && filtered.length > 0,
});
```

Update the inline dropdown list row class:
```tsx
className={`group flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition hover:bg-zinc-800/80 ${
  i === inlineActiveIndex ? "bg-zinc-800/80" : ""
}`}
```

- [ ] **Step 3: Add attacker sprite + move summaries to `MovePickerModal`**

Add `attackerSprite?: string` and `attackerName?: string` to `MovePickerModalProps`:

```typescript
interface MovePickerModalProps {
  moveNames:      string[];
  onSelect:       (move: MoveDetail) => void;
  onClear:        () => void;
  onClose:        () => void;
  attackerSprite?: string;
  attackerName?:  string;
}
```

Add `useMovePrefetch` and `useListKeyboard` inside `MovePickerModal`:

```typescript
import { useMovePrefetch } from "~/hooks/useMovePrefetch";
import { useListKeyboard }  from "~/hooks/useListKeyboard";

function MovePickerModal({ moveNames, onSelect, onClear, onClose, attackerSprite, attackerName }: MovePickerModalProps) {
  // ... existing state ...
  const moveSummaries = useMovePrefetch(moveNames, true);

  const { activeIndex: modalActiveIndex } = useListKeyboard({
    count: filtered.length,
    onConfirm: (i) => { const name = filtered[i]; if (name) void handleSelect(name); },
    onEscape: onClose,
    enabled: !fetching && filtered.length > 0,
  });
  // ... rest of component ...
```

Update the modal header to show the attacker sprite:

```tsx
{/* Header */}
<div className="flex items-center justify-between border-b border-zinc-800/60 px-4 py-3">
  <div className="flex items-center gap-2.5">
    {attackerSprite && (
      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-800">
        <Image src={attackerSprite} alt={attackerName ?? ""} width={24} height={24} unoptimized className="drop-shadow-sm" />
      </div>
    )}
    <span className="text-sm font-semibold text-zinc-200">Change Move</span>
  </div>
  <button onClick={onClose} className="rounded-lg p-1 text-zinc-600 transition hover:text-zinc-300" aria-label="Close">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  </button>
</div>
```

Update the move results list to show enriched rows:

```tsx
<ul className="max-h-72 overflow-y-auto px-3 pb-2">
  {filtered.map((name, i) => {
    const summary = moveSummaries.get(name);
    return (
      <li key={name}>
        <button
          onClick={() => handleSelect(name)}
          className={`group flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition hover:bg-zinc-800 ${
            i === modalActiveIndex ? "bg-zinc-800" : ""
          }`}
        >
          {summary?.type
            ? <TypeBadge type={summary.type} size="sm" />
            : <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-700 transition group-hover:bg-violet-500" />
          }
          <span className="flex-1 capitalize text-zinc-400 transition group-hover:text-white">
            {name.replace(/-/g, " ")}
          </span>
          {summary?.power != null && (
            <span className="shrink-0 font-mono text-[10px] text-zinc-600">{summary.power}</span>
          )}
          {summary?.category && (
            <span className="shrink-0 rounded bg-zinc-800/80 px-1 text-[9px] uppercase tracking-wide text-zinc-600">
              {summary.category === "physical" ? "phys" : summary.category === "special" ? "spec" : "stat"}
            </span>
          )}
        </button>
      </li>
    );
  })}
  {/* ... no-results message unchanged ... */}
</ul>
```

Add `import Image from "next/image"` and `import { TypeBadge } from "~/app/_components/TypeBadge"` to `MoveFuzzySearch.tsx` (TypeBadge is already imported; Image is not currently imported in MoveFuzzySearch — add it).

Update the usage of `MovePickerModal` inside `MoveFuzzySearch` to pass attacker info — but `MoveFuzzySearch` doesn't know about the attacker. Add `attackerSprite?: string` and `attackerName?: string` to `MoveFuzzySearchProps` and thread them through:

```typescript
interface MoveFuzzySearchProps {
  // ... existing ...
  attackerSprite?: string;
  attackerName?:  string;
}

// Inside the filled-state section where MovePickerModal is rendered:
{modalOpen && (
  <MovePickerModal
    moveNames={moveNames}
    onSelect={handleModalSelect}
    onClear={onClear}
    onClose={() => setModalOpen(false)}
    attackerSprite={attackerSprite}
    attackerName={attackerName}
  />
)}
```

- [ ] **Step 4: Pass attacker sprite from `DamageCalculator` to `MoveFuzzySearch`**

In `DamageCalculator.tsx`, update the `MoveFuzzySearch` usage:

```tsx
<MoveFuzzySearch
  moveNames={attacker?.moveNames ?? []}
  value={move}
  isLoadingMove={loadingMove}
  onSelect={m => setMove(m)}
  onClear={() => setMove(null)}
  inputRef={moveInputRef}
  attackerSprite={attacker?.sprite}
  attackerName={attacker?.name}
/>
```

- [ ] **Step 5: Run typecheck**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/calculator/_components/MoveFuzzySearch.tsx src/app/calculator/_components/PokemonPickerModal.tsx
git commit -m "feat(calc): arrow-key nav in all search dropdowns + enriched move/pokemon rows"
```

---

### Task 9: Wire keyboard hook + focus chain into `DamageCalculator`

**Files:**
- Modify: `src/app/calculator/_components/DamageCalculator.tsx`
- Modify: `src/app/calculator/_components/BattleConfigPanel.tsx` (add `levelInputRef` prop)

This task connects `useCalculatorKeyboard` and `useFocusChain` to the calculator. It also updates `EvPanel` and `StatStagePanel` to show a keyboard-focus ring when `kbFocused` is true, and updates `PokemonSlotCard` to forward a `containerRef`.

- [ ] **Step 1: Add `kbFocused` prop to `EvPanel` and `StatStagePanel`**

In `DamageCalculator.tsx`, update `EvPanel`:

```typescript
// Add kbFocused to EvPanelProps
interface EvPanelProps {
  stats: EvStat[];
  evs: Record<string, number>;
  level: number;
  activeKey?: string;
  onChange: (key: string, value: number) => void;
  kbFocused?: boolean; // NEW
}

// In the EvPanel component, update the outer div className:
<div className={`flex flex-col gap-3 rounded-xl border backdrop-blur-sm px-3 py-2.5 transition ${
  kbFocused
    ? "border-violet-500/60 bg-zinc-800/30 ring-1 ring-violet-500/20"
    : "border-zinc-700/40 bg-zinc-800/20"
}`}>
```

In `StatStagePanel.tsx`, update `StatStagePanelProps`:

```typescript
interface StatStagePanelProps {
  stats:     StatStat[];
  stages:    Record<string, number>;
  activeKey?: string;
  onChange:  (key: string, value: number) => void;
  kbFocused?: boolean; // NEW
}

// Update outer div in StatStagePanel:
<div className={`flex flex-col gap-2.5 rounded-xl border backdrop-blur-sm px-3 py-2.5 transition ${
  kbFocused
    ? "border-violet-500/60 bg-zinc-800/30 ring-1 ring-violet-500/20"
    : "border-zinc-700/40 bg-zinc-800/20"
}`}>
```

- [ ] **Step 2: Add `containerRef` to `PokemonSlotCard`**

Still inside `DamageCalculator.tsx`, update `PokemonSlotCardProps` and the component:

```typescript
interface PokemonSlotCardProps {
  label: string;
  value: PokemonSummary | null;
  isLoading?: boolean;
  onOpenPicker: () => void;
  containerRef?: React.RefObject<HTMLDivElement | null>; // NEW
  kbHighlighted?: boolean; // NEW — shows a subtle ring on the outer div
}

function PokemonSlotCard({ label, value, isLoading, onOpenPicker, containerRef, kbHighlighted }: PokemonSlotCardProps) {
  // ...
  return (
    <div
      className={`flex flex-col gap-2 rounded-xl transition ${kbHighlighted ? "ring-1 ring-violet-500/40" : ""}`}
      ref={containerRef}
    >
      {/* ... existing content unchanged ... */}
    </div>
  );
}
```

- [ ] **Step 3: Add `levelInputRef` to `BattleConfigPanel`**

In `src/app/calculator/_components/BattleConfigPanel.tsx`, add an optional ref prop:

```typescript
interface BattleConfigPanelProps {
  config:         BattleConfig;
  onChange:       (config: BattleConfig) => void;
  levelInputRef?: React.RefObject<HTMLInputElement | null>; // NEW
}

export function BattleConfigPanel({ config, onChange, levelInputRef }: BattleConfigPanelProps) {
  // ...
  // In the level <input>, add ref:
  <input
    ref={levelInputRef}
    type="number"
    // ... rest unchanged
  />
```

- [ ] **Step 4: Import hooks and create refs in `DamageCalculator`**

Add to the import block:

```typescript
import { useCalculatorKeyboard, type CalcKbState } from "~/hooks/useCalculatorKeyboard";
import { useFocusChain, type FocusChainEntry }      from "~/hooks/useFocusChain";
```

Inside `DamageCalculator()`, after existing state declarations:

```typescript
const attackerCardRef = useRef<HTMLDivElement>(null);
const defenderCardRef = useRef<HTMLDivElement>(null);
const levelInputRef   = useRef<HTMLInputElement>(null);

const [kbState, setKbState] = useCalculatorKeyboard({
  onOpenAttackerModal:   () => setAttackerModalOpen(true),
  onOpenDefenderModal:   () => setDefenderModalOpen(true),
  onChangeAttackerEv:    (key, val) => setAttackerEvs(prev => ({ ...prev, [key]: val })),
  onChangeDefenderEv:    (key, val) => setDefenderEvs(prev => ({ ...prev, [key]: val })),
  onChangeAttackerStage: (key, val) => setAttackerStages(prev => ({ ...prev, [key]: val })),
  onChangeDefenderStage: (key, val) => setDefenderStages(prev => ({ ...prev, [key]: val })),
  attackerEvs,
  defenderEvs,
  attackerStages,
  defenderStages,
});

// Focus chain — ordered list of interactive elements for Tab navigation
const focusChain = useMemo<FocusChainEntry[]>(() => [
  { id: "attacker-card", getElement: () => attackerCardRef.current?.querySelector<HTMLElement>('[role="button"], button') ?? null },
  { id: "defender-card", getElement: () => defenderCardRef.current?.querySelector<HTMLElement>('[role="button"], button') ?? null },
  { id: "move-search",   getElement: () => moveInputRef.current },
  { id: "level-input",   getElement: () => levelInputRef.current },
], []);

useFocusChain(focusChain);
```

- [ ] **Step 5: Clear keyboard state when modals open**

When a modal opens, clear keyboard slot focus (the modal takes over interaction):

```typescript
// Replace existing setAttackerModalOpen(true) call in the onSelect handlers:
setAttackerModalOpen(true);
setKbState({ slot: null, panel: null, attribute: null });

// Same for defenderModalOpen:
setDefenderModalOpen(true);
setKbState({ slot: null, panel: null, attribute: null });
```

Also clear on modal close in the `onSelect` callbacks — already done implicitly since slot clears on modal open.

- [ ] **Step 6: Compute effective active keys with keyboard override**

```typescript
// Keyboard can override which attribute is highlighted in panels
const effectiveAttackerKey = kbState.slot === "attacker" && kbState.attribute
  ? kbState.attribute
  : attackerActiveKey;
const effectiveDefenderKey = kbState.slot === "defender" && kbState.attribute
  ? kbState.attribute
  : defenderActiveKey;
```

Replace all uses of `attackerActiveKey` → `effectiveAttackerKey` and `defenderActiveKey` → `effectiveDefenderKey` when passed to panels.

- [ ] **Step 7: Thread new props into JSX**

```tsx
{/* Pokemon pickers */}
<div className="relative grid grid-cols-2 gap-3">
  <PokemonSlotCard
    label="Attacker"
    value={attacker}
    isLoading={loadingAttacker}
    onOpenPicker={() => { setAttackerModalOpen(true); setKbState({ slot: null, panel: null, attribute: null }); }}
    containerRef={attackerCardRef}
    kbHighlighted={kbState.slot === "attacker"}
  />
  {/* ... vs badge ... */}
  <PokemonSlotCard
    label="Defender"
    value={defender}
    isLoading={loadingDefender}
    onOpenPicker={() => { setDefenderModalOpen(true); setKbState({ slot: null, panel: null, attribute: null }); }}
    containerRef={defenderCardRef}
    kbHighlighted={kbState.slot === "defender"}
  />
</div>

{/* In the EvPanels, replace activeKey with effectiveAttackerKey/effectiveDefenderKey and add kbFocused: */}
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

{/* BattleConfigPanel — add levelInputRef */}
<BattleConfigPanel
  config={battleConfig}
  onChange={setBattleConfig}
  levelInputRef={levelInputRef}
/>
```

- [ ] **Step 8: Update the hotkey legend in DamageCalculator**

The existing hotkey legend (small text at the bottom of the page) should be updated to reflect the new keyboard controls. Replace any existing legend with:

```tsx
{/* Hotkey legend */}
<div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-zinc-700">
  {[
    { keys: ["1", "2"],           desc: "Focus attacker / defender" },
    { keys: ["e", "b"],           desc: "EV panel / Buff panel" },
    { keys: ["a", "s", "↑", "↓"], desc: "Physical / Special attribute" },
    { keys: ["+", "−", "← →"],   desc: "Adjust value" },
    { keys: ["Enter"],            desc: "Open Pokemon search" },
    { keys: ["K"],                desc: "Focus move search" },
    { keys: ["Esc"],              desc: "Clear focus" },
  ].map(({ keys, desc }) => (
    <span key={desc} className="flex items-center gap-1">
      {keys.map(k => (
        <kbd key={k} className="rounded bg-zinc-900 px-1 py-0.5 font-mono text-zinc-600">{k}</kbd>
      ))}
      <span>{desc}</span>
    </span>
  ))}
</div>
```

- [ ] **Step 9: Run typecheck**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 10: Commit**

```bash
git add src/app/calculator/_components/DamageCalculator.tsx \
        src/app/calculator/_components/BattleConfigPanel.tsx \
        src/app/calculator/_components/StatStagePanel.tsx
git commit -m "feat(calc): wire keyboard state machine + focus chain + panel focus indicators"
```

---

## Self-Review Checklist

**Spec coverage:**

| Requirement | Task |
|-------------|------|
| Escape returns to unfocused state | Task 1 |
| 1/2 highlights attacker/defender | Task 1, Task 9 |
| Enter opens pokemon search | Task 1 |
| e/b selects EV/Stage panel | Task 1 |
| a/s selects physical/special attribute | Task 1 |
| +/ArrowRight, -/ArrowLeft adjusts value | Task 1 |
| Tab focus chain, configurable | Task 2, Task 9 |
| HP bar in damage result middle | Task 6 |
| Enhanced move rows with type + power | Task 8 |
| Pokemon search rows with sprites + types | Tasks 5–7 |
| Arrow-key navigation in all dropdowns | Task 8 |

**Type consistency check:**
- `FocusAttribute` values (`"attack"`, `"spAttack"`, `"defense"`, `"spDefense"`) match the keys used in `attackerEvs`, `defenderEvs`, `attackerStages`, `defenderStages` in `DamageCalculator`.
- `kbFocused?: boolean` added to both `EvPanel` and `StatStagePanel` — same prop name, same type.
- `containerRef?: React.RefObject<HTMLDivElement | null>` on `PokemonSlotCard`, applied to the outer container `<div>`.
- `levelInputRef?: React.RefObject<HTMLInputElement | null>` on `BattleConfigPanel`, forwarded to the `<input type="number">`.
- `MoveSummary` in `useMovePrefetch` uses `PokemonType` and `MoveCategory` from `~/lib/types` — consistent with `MoveDetail`.
- `attackerSprite?: string` / `attackerName?: string` added to both `MoveFuzzySearchProps` and `MovePickerModalProps`.
