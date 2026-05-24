# Damage Calculator Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the damage calculator the app's primary experience with improved layout, a modifier/OHKO breakdown, a randomized battle scenario toggle, keyboard shortcuts, and fixed x4 type effectiveness.

**Architecture:** Calculator moves to `/` (root redirects there). `DamageResult` is extended with `baseDamage` and `modifiedBeforeRandom` so the result card can compute OHKO probability without touching `damage.ts` further. Keyboard shortcuts live in a small `useKeyboardShortcuts` hook imported per page. The random scenario handler is a self-contained function inside `DamageCalculator` that uses `utils.pokemon.search.fetch()` imperative calls — no new tRPC procedures needed.

**Tech Stack:** Next.js 15 App Router · tRPC v11 · React 19 · Tailwind CSS v4 · Vitest 4

---

## File Map

| Status | Path | Responsibility |
|--------|------|----------------|
| Modify | `src/app/page.tsx` | Redirect `/` → `/calculator` |
| Modify | `src/app/layout.tsx` | Update metadata title/description |
| Modify | `src/app/_components/Nav.tsx` | Damage Calc first, logo → `/calculator` |
| Modify | `src/app/calculator/page.tsx` | Centered layout, page-level hotkeys wired in |
| Modify | `src/lib/damage.ts` | Add `baseDamage` + `modifiedBeforeRandom` to `DamageResult`; fix x4 display regression |
| Modify | `src/lib/__tests__/damage.test.ts` | x4 coverage + OHKO probability tests |
| Create | `src/lib/ohko.ts` | `calcOhkoOdds(modifiedBeforeRandom, defenderBaseHp)` pure function |
| Create | `src/lib/__tests__/ohko.test.ts` | Unit tests for OHKO probability |
| Modify | `src/app/calculator/_components/DamageCalculator.tsx` | Fuzzy search, random scenario, keyboard shortcuts, `onClear` fix |
| Modify | `src/app/calculator/_components/DamageResult.tsx` | Modifier chain UI + OHKO odds display |
| Create | `src/hooks/useKeyboardShortcuts.ts` | `useKeyboardShortcuts(map)` — attaches window keydown, cleans up |
| Modify | `src/app/teams/_components/TeamBuilder.tsx` | Wire Ctrl+K to open next empty slot search |

---

## Task 1 — DX-26: Make /calculator the root + fix centering

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/app/layout.tsx`
- Modify: `src/app/_components/Nav.tsx`
- Modify: `src/app/calculator/page.tsx`

- [ ] **Step 1: Redirect root to /calculator**

Replace `src/app/page.tsx`:

```tsx
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/calculator");
}
```

- [ ] **Step 2: Update metadata**

In `src/app/layout.tsx`, change the `metadata` export:

```tsx
export const metadata: Metadata = {
  title: "dxtr — Pokémon Damage Calculator",
  description: "Simulate damage, OHKO odds, and type matchups at level 50.",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};
```

- [ ] **Step 3: Reorder Nav links + update logo href**

Replace the links array and logo `href` in `src/app/_components/Nav.tsx`:

```tsx
const links = [
  { href: "/calculator", label: "Damage Calc" },
  { href: "/teams",      label: "Team Builder" },
];
```

And change the logo link from `href="/teams"` to `href="/calculator"`:

```tsx
<Link href="/calculator" className="text-lg font-bold tracking-tight text-white">
  dxtr<span className="text-violet-400">.</span>
</Link>
```

- [ ] **Step 4: Center and widen the calculator layout**

Replace `src/app/calculator/page.tsx`:

```tsx
import { api, HydrateClient } from "~/trpc/server";
import { DamageCalculator } from "./_components/DamageCalculator";

export default async function CalculatorPage() {
  void api.pokemon.listNames.prefetch();
  return (
    <HydrateClient>
      <div className="flex flex-col items-center">
        <div className="w-full max-w-2xl">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold tracking-tight">Damage Calculator</h1>
            <p className="mt-1 text-sm text-zinc-400">
              Level 50 · Base stats · Gen 6+ formula
            </p>
          </div>
          <DamageCalculator />
        </div>
      </div>
    </HydrateClient>
  );
}
```

- [ ] **Step 5: Typecheck**

```powershell
pnpm typecheck
```

Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/app/page.tsx src/app/layout.tsx src/app/_components/Nav.tsx src/app/calculator/page.tsx
git commit -m "feat(nav): damage calc is primary page + centered layout"
```

---

## Task 2 — DX-27: x4 type effectiveness — tests + fix

**Files:**
- Modify: `src/lib/__tests__/damage.test.ts`
- Modify: `src/lib/damage.ts` (fix only if tests fail)

The existing `getTypeEffectiveness` tests cover only single-type defenders and single-multiplier cases. No x4 tests exist. The user reports x4 matchups (dual-type defender, both types weak to the move) display as x2. This task pins the behaviour and fixes it.

- [ ] **Step 1: Add x4 tests to damage.test.ts**

Append to the existing `describe("getTypeEffectiveness")` block in `src/lib/__tests__/damage.test.ts`:

```typescript
  // x4 scenarios — dual-type defenders, both weak to the move
  it("electric x4 vs water/flying (Gyarados)", () => {
    expect(getTypeEffectiveness("electric", ["water", "flying"])).toBe(4);
  });

  it("grass x4 vs water/ground (Swampert)", () => {
    expect(getTypeEffectiveness("grass", ["water", "ground"])).toBe(4);
  });

  it("rock x4 vs fire/flying (Charizard)", () => {
    expect(getTypeEffectiveness("rock", ["fire", "flying"])).toBe(4);
  });

  it("ice x4 vs ground/flying (Landorus)", () => {
    expect(getTypeEffectiveness("ice", ["ground", "flying"])).toBe(4);
  });

  it("fighting x4 vs rock/dark (Tyranitar)", () => {
    expect(getTypeEffectiveness("fighting", ["rock", "dark"])).toBe(4);
  });

  it("ground x4 vs fire/steel (Heatran)", () => {
    expect(getTypeEffectiveness("ground", ["fire", "steel"])).toBe(4);
  });

  // 0.25x scenarios — dual-type defenders, both resist the move
  it("fire 0.25x vs water/rock (Kabutops)", () => {
    expect(getTypeEffectiveness("fire", ["water", "rock"])).toBe(0.25);
  });

  // Immunity overrides super-effectiveness
  it("normal is immune vs ghost/flying (Gengar form)", () => {
    expect(getTypeEffectiveness("normal", ["ghost", "flying"])).toBe(0);
  });
```

- [ ] **Step 2: Run tests — identify any failures**

```powershell
pnpm vitest run
```

If any x4 tests fail, the failing output will identify the exact combination. Proceed to Step 3 only if failures exist.

- [ ] **Step 3: Fix getTypeEffectiveness if tests failed**

The most likely cause: the type chart's `reduce` starts at 1 and stops multiplying after the first type if `defenderTypes` length is wrong. If tests pass in Step 2, skip this step.

If tests fail due to a chart entry being wrong, fix the specific entry in `src/lib/damage.ts` `CHART`. The fix follows the pattern:

```typescript
// Example: if electric vs flying was missing, add it:
electric: { electric: 0.5, grass: 0.5, dragon: 0.5, ground: 0, flying: 2, water: 2 },
// flying: 2 was already present — verify the CHART entry for the failing combination
```

If tests fail for a DIFFERENT reason, investigate the `reduce` call:

```typescript
// Current (should be correct):
return defenderTypes.reduce((mult, defType) => {
  return mult * (attackChart[defType] ?? 1);
}, 1);
```

If `defenderTypes` is unexpectedly a single-element array at runtime (PokeAPI returning one type for a dual-type Pokemon), the fix is to log it in `fetchPokemon` and verify. No code change needed — the formula is correct.

- [ ] **Step 4: Fix the DamageResultCard label for x4**

Open `src/app/calculator/_components/DamageResult.tsx`. The current `effectLabel` uses `result.typeEffectiveness <= 2` for "Super effective!" and anything above for "Super effective!! (4×)". Improve the label to handle intermediate values and be explicit:

```tsx
const effectLabel =
  result.typeEffectiveness === 0    ? "Immune — no effect" :
  result.typeEffectiveness === 0.25 ? "Doubly resisted (¼×)" :
  result.typeEffectiveness < 1      ? "Not very effective… (½×)" :
  result.typeEffectiveness === 1    ? "Neutral" :
  result.typeEffectiveness === 2    ? "Super effective! (2×)" :
                                      "Doubly super effective! (4×)";

const effectColour =
  result.typeEffectiveness === 0    ? "text-zinc-600" :
  result.typeEffectiveness < 1      ? "text-orange-400" :
  result.typeEffectiveness === 1    ? "text-zinc-400" :
  result.typeEffectiveness === 2    ? "text-green-400" :
                                      "text-emerald-300 font-black";
```

- [ ] **Step 5: Run full test suite**

```powershell
pnpm vitest run
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/lib/__tests__/damage.test.ts src/lib/damage.ts src/app/calculator/_components/DamageResult.tsx
git commit -m "fix(calc): x4 type effectiveness tests + improved effect labels"
```

---

## Task 3 — DX-28: Extend DamageResult + OHKO probability library

**Files:**
- Modify: `src/lib/damage.ts`
- Create: `src/lib/ohko.ts`
- Create: `src/lib/__tests__/ohko.test.ts`

- [ ] **Step 1: Add baseDamage + modifiedBeforeRandom to DamageResult**

In `src/lib/damage.ts`, update the `DamageResult` interface and `calculateDamage` function:

```typescript
export interface DamageResult {
  min: number;
  max: number;
  average: number;
  stab: number;
  typeEffectiveness: number;
  baseDamage: number;          // floor(base), before STAB and TE
  modifiedBeforeRandom: number; // base × stab × TE, before the 0.85–1.0 roll
}

export function calculateDamage(input: DamageInput): DamageResult {
  const { level, power, attackStat, defenseStat, stab, typeEffectiveness } = input;
  const stabMult = stab ? 1.5 : 1.0;
  const base = (((2 * level) / 5 + 2) * power * (attackStat / defenseStat)) / 50 + 2;
  const modified = base * stabMult * typeEffectiveness;
  return {
    min: Math.floor(modified * 0.85),
    max: Math.floor(modified),
    average: Math.floor(modified * 0.925),
    stab: stabMult,
    typeEffectiveness,
    baseDamage: Math.floor(base),
    modifiedBeforeRandom: modified,
  };
}
```

- [ ] **Step 2: Write the failing OHKO tests**

Create `src/lib/__tests__/ohko.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { calcOhkoOdds, defenderHpAtL50 } from "~/lib/ohko";

describe("defenderHpAtL50", () => {
  // HP formula (0 IVs, 0 EVs, level 50):
  //   floor((2 × base + 0) × 50 / 100) + 50 + 10 = base + 60
  it("returns base+60 for level 50 with 0 IVs/EVs", () => {
    expect(defenderHpAtL50(45)).toBe(105);   // Pikachu
    expect(defenderHpAtL50(160)).toBe(220);  // Snorlax
    expect(defenderHpAtL50(1)).toBe(61);     // Shedinja (1 HP base)
  });
});

describe("calcOhkoOdds", () => {
  // 16 random rolls: 85/100 through 100/100
  // OHKO when floor(modifiedBeforeRandom × roll / 100) >= defenderHp

  it("returns 1 (always OHKO) when min damage >= defenderHp", () => {
    // modifiedBeforeRandom=200, defenderHp=100
    // min = floor(200 × 0.85) = 170 >= 100 → all 16 rolls OHKO
    expect(calcOhkoOdds(200, 100)).toBe(1);
  });

  it("returns 0 (never OHKO) when max damage < defenderHp", () => {
    // modifiedBeforeRandom=100, defenderHp=200
    // max = floor(100 × 1.0) = 100 < 200 → no rolls OHKO
    expect(calcOhkoOdds(100, 200)).toBe(0);
  });

  it("returns partial odds when HP is in the damage range", () => {
    // modifiedBeforeRandom=100, defenderHp=97
    // Rolls that OHKO: those where floor(100 × roll/100) >= 97
    //   roll=97: floor(97) = 97 ✓
    //   roll=98: floor(98) = 98 ✓
    //   roll=99: floor(99) = 99 ✓
    //   roll=100: floor(100) = 100 ✓
    // That's 4 rolls out of 16 → 4/16 = 0.25
    expect(calcOhkoOdds(100, 97)).toBeCloseTo(4 / 16);
  });

  it("returns 1/16 for exactly the max roll reaching HP", () => {
    // Only the roll=100 (1.0) achieves exactly defenderHp
    // modifiedBeforeRandom=100, defenderHp=100
    // floor(100 × 100/100) = 100 >= 100 → only roll 100 OHKOs → 1/16
    expect(calcOhkoOdds(100, 100)).toBeCloseTo(1 / 16);
  });
});
```

- [ ] **Step 3: Run tests — expect failure (module not found)**

```powershell
pnpm vitest run
```

Expected: `Cannot find module '~/lib/ohko'`

- [ ] **Step 4: Create ohko.ts**

Create `src/lib/ohko.ts`:

```typescript
/**
 * Defender's HP at level 50 with 0 IVs and 0 EVs.
 * HP = floor((2 × base) × 50 / 100) + 50 + 10 = base + 60
 */
export function defenderHpAtL50(baseHp: number): number {
  return Math.floor((2 * baseHp * 50) / 100) + 50 + 10;
}

/**
 * Probability of a one-hit KO.
 * Gen 6+: 16 uniform random rolls from 85/100 to 100/100.
 * OHKO occurs when floor(modifiedBeforeRandom × roll/100) >= defenderHp.
 */
export function calcOhkoOdds(modifiedBeforeRandom: number, defenderHp: number): number {
  let ohkoCount = 0;
  for (let roll = 85; roll <= 100; roll++) {
    if (Math.floor((modifiedBeforeRandom * roll) / 100) >= defenderHp) {
      ohkoCount++;
    }
  }
  return ohkoCount / 16;
}
```

- [ ] **Step 5: Run tests — all must pass**

```powershell
pnpm vitest run
```

Expected: all test files pass (damage.test.ts + natures.test.ts + ohko.test.ts).

- [ ] **Step 6: Commit**

```bash
git add src/lib/damage.ts src/lib/ohko.ts src/lib/__tests__/ohko.test.ts
git commit -m "feat(lib): baseDamage + modifiedBeforeRandom in DamageResult; OHKO probability helper"
```

---

## Task 4 — DX-29: DamageResult card — modifier chain + OHKO display

**Files:**
- Modify: `src/app/calculator/_components/DamageResult.tsx`

The card currently shows STAB, Type, and Avg in a 3-column row. Replace it with a two-section layout: a modifier chain showing how damage is built up step by step, and an OHKO odds section below.

- [ ] **Step 1: Replace DamageResult.tsx**

```tsx
import { type DamageResult } from "~/lib/damage";
import { calcOhkoOdds, defenderHpAtL50 } from "~/lib/ohko";

interface DamageResultCardProps {
  result: DamageResult;
  moveName: string;
  attackerName: string;
  defenderName: string;
  defenderBaseHp: number;
}

function ModifierPill({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`flex flex-col items-center rounded-xl px-3 py-2 ${highlight ? "bg-violet-900/40 ring-1 ring-violet-700" : "bg-zinc-800/60"}`}>
      <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">{label}</span>
      <span className={`text-sm font-bold tabular-nums ${highlight ? "text-violet-300" : "text-zinc-200"}`}>{value}</span>
    </div>
  );
}

export function DamageResultCard({
  result,
  moveName,
  attackerName,
  defenderName,
  defenderBaseHp,
}: DamageResultCardProps) {
  const effectLabel =
    result.typeEffectiveness === 0    ? "Immune — no effect" :
    result.typeEffectiveness === 0.25 ? "Doubly resisted (¼×)" :
    result.typeEffectiveness < 1      ? "Not very effective… (½×)" :
    result.typeEffectiveness === 1    ? "Neutral" :
    result.typeEffectiveness === 2    ? "Super effective! (2×)" :
                                        "Doubly super effective! (4×)";

  const effectColour =
    result.typeEffectiveness === 0    ? "text-zinc-600" :
    result.typeEffectiveness < 1      ? "text-orange-400" :
    result.typeEffectiveness === 1    ? "text-zinc-400" :
    result.typeEffectiveness === 2    ? "text-green-400" :
                                        "text-emerald-300";

  const defHp = defenderHpAtL50(defenderBaseHp);
  const ohkoOdds = calcOhkoOdds(result.modifiedBeforeRandom, defHp);
  const ohkoPercent = Math.round(ohkoOdds * 100);
  const ohkoRolls = Math.round(ohkoOdds * 16);

  const ohkoLabel =
    ohkoOdds === 0   ? `Won't OHKO (max ${result.max} vs ${defHp} HP)` :
    ohkoOdds === 1   ? "Always OHKOs!" :
                       `${ohkoRolls}/16 rolls OHKO (${ohkoPercent}%)`;

  const ohkoColour =
    ohkoOdds === 0 ? "text-zinc-500" :
    ohkoOdds === 1 ? "text-green-400" :
                     "text-yellow-400";

  return (
    <div className="animate-fade-in flex flex-col gap-5 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
      {/* Header */}
      <p className="text-sm text-zinc-400">
        <span className="font-semibold capitalize text-white">{attackerName}</span>
        {" uses "}
        <span className="font-semibold capitalize text-violet-300">{moveName.replace(/-/g, " ")}</span>
        {" on "}
        <span className="font-semibold capitalize text-white">{defenderName}</span>
      </p>

      {/* Damage range — hero number */}
      <div className="flex items-end gap-3">
        <div className="flex flex-col">
          <span className="text-xs text-zinc-500">Damage range</span>
          <span className="text-5xl font-black tabular-nums leading-none">
            {result.min}–{result.max}
          </span>
        </div>
        <span className={`mb-1 text-sm font-semibold ${effectColour}`}>{effectLabel}</span>
      </div>

      {/* Modifier chain */}
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-600">Modifier breakdown</p>
        <div className="flex flex-wrap items-center gap-2">
          <ModifierPill label="Base" value={String(result.baseDamage)} />
          <span className="text-zinc-600">×</span>
          <ModifierPill
            label="STAB"
            value={result.stab === 1.5 ? "×1.5" : "×1.0"}
            highlight={result.stab === 1.5}
          />
          <span className="text-zinc-600">×</span>
          <ModifierPill
            label="Type"
            value={`×${result.typeEffectiveness}`}
            highlight={result.typeEffectiveness !== 1}
          />
          <span className="text-zinc-600">=</span>
          <ModifierPill label="Pre-roll" value={String(Math.floor(result.modifiedBeforeRandom))} />
        </div>
      </div>

      {/* OHKO odds */}
      <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-medium uppercase tracking-wider text-zinc-600">OHKO odds</span>
          <span className={`text-sm font-semibold ${ohkoColour}`}>{ohkoLabel}</span>
        </div>
        {ohkoOdds > 0 && ohkoOdds < 1 && (
          <div className="flex h-8 w-24 overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-yellow-500 transition-all duration-500"
              style={{ width: `${ohkoPercent}%` }}
            />
          </div>
        )}
        {ohkoOdds === 1 && (
          <span className="rounded-full bg-green-900/50 px-3 py-1 text-xs font-bold text-green-400 ring-1 ring-green-800">
            100%
          </span>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Update DamageCalculator to pass defenderBaseHp**

In `src/app/calculator/_components/DamageCalculator.tsx`, the `<DamageResultCard>` call currently passes 4 props. Add `defenderBaseHp`:

Find:
```tsx
{result && attacker && defender && (
  <DamageResultCard
    result={result.dmg}
    moveName={result.move.name}
    attackerName={attacker.name}
    defenderName={defender.name}
  />
)}
```

Replace with:
```tsx
{result && attacker && defender && (
  <DamageResultCard
    result={result.dmg}
    moveName={result.move.name}
    attackerName={attacker.name}
    defenderName={defender.name}
    defenderBaseHp={defender.baseStats.hp}
  />
)}
```

- [ ] **Step 3: Typecheck**

```powershell
pnpm typecheck
```

Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/app/calculator/_components/DamageResult.tsx src/app/calculator/_components/DamageCalculator.tsx
git commit -m "feat(ui): modifier chain + OHKO odds in damage result card"
```

---

## Task 5 — DX-30: Random battle scenario toggle

**Files:**
- Modify: `src/app/calculator/_components/DamageCalculator.tsx`

The toggle lives at the top of `DamageCalculator`. When ON (default), it auto-populates attacker, defender, and a random damaging move on mount (and whenever re-enabled). State is persisted to `sessionStorage` key `dxtr-random-battle`. The randomisation uses the tRPC utils imperative `fetch()` API so no new procedures are needed.

- [ ] **Step 1: Add the random scenario state + toggle + randomize function to DamageCalculator**

Read `src/app/calculator/_components/DamageCalculator.tsx` first, then apply the following changes to the component:

Add these imports at the top:
```tsx
import { useEffect, useCallback } from "react";
```

Change the existing `import { useState } from "react"` to include `useEffect` and `useCallback`.

Also add this import:
```tsx
import { api } from "~/trpc/react";
```

(It's likely already there — confirm and skip if so.)

Inside `DamageCalculator()`, add the random toggle state and the full name list query right after the existing state declarations:

```tsx
const STORAGE_KEY = "dxtr-random-battle";

const [randomEnabled, setRandomEnabled] = useState<boolean>(() => {
  if (typeof window === "undefined") return true;
  const stored = sessionStorage.getItem(STORAGE_KEY);
  return stored === null ? true : stored === "true";
});

const { data: allNames = [] } = api.pokemon.listNames.useQuery(undefined, {
  staleTime: Infinity,
});

const utils = api.useUtils();
```

Note: `utils` is likely already declared for the `saveTeam` mutation — check and keep only one declaration.

Add the `randomizeBattle` function (after state declarations, before `return`):

```tsx
const randomizeBattle = useCallback(async () => {
  if (allNames.length === 0) return;

  const pick = () => allNames[Math.floor(Math.random() * allNames.length)]!;
  const attName = pick();
  let defName = pick();
  // Avoid identical attacker/defender
  while (defName === attName && allNames.length > 1) defName = pick();

  setResult(null);

  const [att, def] = await Promise.all([
    utils.pokemon.search.fetch({ query: attName }),
    utils.pokemon.search.fetch({ query: defName }),
  ]);
  setAttacker(att);
  setDefender(def);
  setMoveQuery("");
  setMoveSubmitted("");

  // Find a damaging move (up to 10 attempts)
  const candidates = [...att.moveNames].sort(() => Math.random() - 0.5);
  for (const moveName of candidates.slice(0, 10)) {
    try {
      const move = await utils.pokemon.getMove.fetch({ moveName });
      if (move.power !== null && move.power > 0 && move.category !== "status") {
        setMoveQuery(moveName.replace(/-/g, " "));
        setMoveSubmitted(moveName);
        break;
      }
    } catch {
      // skip unavailable moves
    }
  }
}, [allNames, utils]);
```

Add the mount effect (runs once when names are loaded + randomEnabled is true):

```tsx
const hasRandomized = useRef(false);
useEffect(() => {
  if (randomEnabled && allNames.length > 0 && !hasRandomized.current) {
    hasRandomized.current = true;
    void randomizeBattle();
  }
}, [randomEnabled, allNames.length, randomizeBattle]);
```

Add `useRef` to the React import.

- [ ] **Step 2: Add the toggle UI at the top of the returned JSX**

Inside the `return (...)` of `DamageCalculator`, prepend this block before the Pokemon pickers grid:

```tsx
{/* Random scenario toggle */}
<div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3">
  <div className="flex items-center gap-3">
<div className="flex flex-col gap-0.5">
    <span className="text-sm font-medium text-zinc-200">Random Battle</span>
    <span className="text-xs text-zinc-500">
      {randomEnabled ? "Auto-loads a random matchup" : "Manual input mode"}
    </span>
  </div>

    {randomEnabled && (
      <button
        onClick={() => void randomizeBattle()}
        disabled={allNames.length === 0}
        className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-400 transition hover:border-violet-600 hover:text-violet-400 disabled:opacity-40"
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
      className={`relative h-6 w-11 rounded-full transition-colors ${
        randomEnabled ? "bg-violet-600" : "bg-zinc-700"
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
          randomEnabled ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  </div>
</div>
```

- [ ] **Step 3: Typecheck**

```powershell
pnpm typecheck
```

Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/app/calculator/_components/DamageCalculator.tsx
git commit -m "feat(calc): randomised battle scenario toggle with session storage"
```

---

## Task 6 — DX-31: Keyboard shortcuts

**Files:**
- Create: `src/hooks/useKeyboardShortcuts.ts`
- Modify: `src/app/calculator/_components/DamageCalculator.tsx`
- Modify: `src/app/teams/_components/TeamBuilder.tsx`

**Design:**
- `Enter` (when focus is not inside an `<input>`, `<select>`, or `<textarea>`) or `Ctrl+Enter` (anywhere) → trigger the primary action for the page.
- `Ctrl+K` → focus the first unfilled search input on the current page.

The hook attaches a `keydown` listener and cleans up on unmount. It receives a plain object mapping shortcut keys to callbacks.

- [ ] **Step 1: Create useKeyboardShortcuts.ts**

Create `src/hooks/useKeyboardShortcuts.ts`:

```typescript
import { useEffect } from "react";

type ShortcutMap = {
  /** Fired by Enter when focus is NOT in an input, OR by Ctrl+Enter anywhere */
  onSubmit?: () => void;
  /** Fired by Ctrl+K */
  onSearch?: () => void;
};

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

export function useKeyboardShortcuts({ onSubmit, onSearch }: ShortcutMap) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "k" && e.ctrlKey) {
        e.preventDefault();
        onSearch?.();
        return;
      }

      if (e.key === "Enter") {
        if (e.ctrlKey) {
          e.preventDefault();
          onSubmit?.();
          return;
        }
        // Plain Enter only fires submit when not inside a form input
        if (!isInputFocused()) {
          e.preventDefault();
          onSubmit?.();
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onSubmit, onSearch]);
}
```

- [ ] **Step 2: Wire shortcuts into DamageCalculator**

In `src/app/calculator/_components/DamageCalculator.tsx`:

Add import:
```tsx
import { useKeyboardShortcuts } from "~/hooks/useKeyboardShortcuts";
```

Add refs for the attacker and move inputs (add at the top of `DamageCalculator`, alongside other state):
```tsx
const attackerInputRef = useRef<HTMLInputElement>(null);
const defenderInputRef = useRef<HTMLInputElement>(null);
const moveInputRef     = useRef<HTMLInputElement>(null);
```

Wire the hook after the state declarations:
```tsx
useKeyboardShortcuts({
  onSubmit: () => {
    if (attacker && defender && moveData) calculate();
  },
  onSearch: () => {
    if (!attacker) {
      attackerInputRef.current?.focus();
    } else if (!defender) {
      defenderInputRef.current?.focus();
    } else {
      moveInputRef.current?.focus();
    }
  },
});
```

Pass the refs into `PokemonPicker` and the move input. Update the `PokemonPicker` interface to accept `inputRef`:

In the `PokemonPicker` component definition (still inside `DamageCalculator.tsx`):
```tsx
interface PokemonPickerProps {
  label: string;
  value: PokemonSummary | null;
  onPick: (p: PokemonSummary) => void;
  onClear: () => void;
  inputRef?: React.RefObject<HTMLInputElement>;
}
```

Update the form's `<input>` inside `PokemonPicker` to forward the ref:
```tsx
<input
  ref={inputRef}
  value={query}
  onChange={e => setQuery(e.target.value)}
  placeholder="Pokemon name…"
  className="flex-1 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-violet-500"
/>
```

Update the "Change" button to call `onClear` (this also fixes the existing bug where Change doesn't clear the parent's state):
```tsx
<button
  onClick={() => { setSubmitted(""); setQuery(""); onClear(); }}
  className="ml-auto text-xs text-zinc-600 hover:text-white"
>
  Change
</button>
```

Update both `<PokemonPicker>` usages in `DamageCalculator`'s JSX:
```tsx
<PokemonPicker
  label="Attacker"
  value={attacker}
  onPick={p => { setAttacker(p); setResult(null); }}
  onClear={() => { setAttacker(null); setResult(null); }}
  inputRef={attackerInputRef}
/>
<PokemonPicker
  label="Defender"
  value={defender}
  onPick={p => { setDefender(p); setResult(null); }}
  onClear={() => { setDefender(null); setResult(null); }}
  inputRef={defenderInputRef}
/>
```

Pass `moveInputRef` to the move `<input>`:
```tsx
<input
  ref={moveInputRef}
  value={moveQuery}
  onChange={e => setMoveQuery(e.target.value)}
  placeholder="flamethrower, earthquake…"
  className="flex-1 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-violet-500"
/>
```

Also: wire `Enter` on the `Calculate Damage` button by making the outer `<div className="flex flex-col gap-6">` a `<form>` with `onSubmit`:

Replace:
```tsx
<button
  onClick={calculate}
  disabled={!attacker || !defender || !moveData}
  className="w-full rounded-xl bg-violet-600 py-3 font-semibold text-white transition hover:bg-violet-500 disabled:opacity-40"
>
  Calculate Damage
</button>
```

With:
```tsx
<button
  type="button"
  onClick={calculate}
  disabled={!attacker || !defender || !moveData}
  className="w-full rounded-xl bg-violet-600 py-3 font-semibold text-white transition hover:bg-violet-500 disabled:opacity-40"
>
  Calculate Damage
  <span className="ml-2 text-xs font-normal opacity-60">↵ Enter</span>
</button>
```

- [ ] **Step 3: Wire Ctrl+K into TeamBuilder**

In `src/app/teams/_components/TeamBuilder.tsx`, add the import:
```tsx
import { useKeyboardShortcuts } from "~/hooks/useKeyboardShortcuts";
```

Add the hook call inside `TeamBuilder()`, after state declarations:
```tsx
useKeyboardShortcuts({
  onSearch: () => {
    const firstEmpty = slots.findIndex(s => s === null);
    if (firstEmpty !== -1) openSearch(firstEmpty);
  },
});
```

- [ ] **Step 4: Typecheck**

```powershell
pnpm typecheck
```

Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useKeyboardShortcuts.ts \
        src/app/calculator/_components/DamageCalculator.tsx \
        src/app/teams/_components/TeamBuilder.tsx
git commit -m "feat(ux): keyboard shortcuts — Enter to calculate, Ctrl+K to focus search"
```

---

## Task 7 — DX-32: UI/UX polish pass

**Files:**
- Modify: `src/app/calculator/_components/DamageCalculator.tsx`
- Modify: `src/app/_components/Nav.tsx`

Apply the frontend-design skill's visual quality bar: meaningful empty states, intentional density, smooth micro-interactions. This task consolidates the DamageCalculator into a cleaner, more premium layout now that all features are wired.

- [ ] **Step 1: Invoke the frontend-design skill**

> **Note for agentic workers:** At this step, invoke `frontend-design:frontend-design` skill, passing it the current `DamageCalculator.tsx` file content and this instruction: *"Improve the visual design and UX of the DamageCalculator component. The component has: a random battle toggle at top, two PokemonPicker inputs (attacker/defender), a move input, a Calculate button, and a DamageResultCard below. Requirements: (1) The two Pokemon pickers should be in a side-by-side layout with a vs. divider between them on wider screens. (2) The Pokemon card view (after a Pokemon is picked) should show the sprite more prominently with type badges. (3) The empty state for each picker should have a ghost/dashed border placeholder with slot icon. (4) The move section should be visually separated from the pickers. (5) The Calculate button should be full-width, violet, with the ↵ hint. (6) Overall: dark zinc-950 background, violet accents, tight but breathable. Do not add new tRPC queries or change component logic — styling only."*

- [ ] **Step 2: Apply a keyboard shortcut legend below the Calculate button**

Below the Calculate button, add a subtle hotkey legend:

```tsx
<div className="flex justify-center gap-6 text-xs text-zinc-600">
  <span><kbd className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-zinc-500">↵</kbd> Calculate</span>
  <span><kbd className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-zinc-500">Ctrl K</kbd> Focus search</span>
  <span><kbd className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-zinc-500">↺</kbd> Reroll</span>
</div>
```

- [ ] **Step 3: Add active indicator to Nav for root path**

In `src/app/_components/Nav.tsx`, the active check uses `pathname.startsWith(href)`. Since root `/` now redirects to `/calculator`, the "Damage Calc" link will correctly highlight. Verify and confirm this works without changes. If the nav highlights both links when on `/calculator` (shouldn't happen), change the active check to:

```tsx
const active = href === "/calculator"
  ? pathname === "/calculator" || pathname === "/"
  : pathname.startsWith(href);
```

- [ ] **Step 4: Run full test suite**

```powershell
pnpm vitest run
```

Expected: all tests pass.

- [ ] **Step 5: Typecheck**

```powershell
pnpm typecheck
```

Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/app/calculator/_components/DamageCalculator.tsx src/app/_components/Nav.tsx
git commit -m "feat(ui): damage calculator visual polish + hotkey legend"
```

---

## Self-Review

**Spec coverage:**
| Requirement | Task |
|---|---|
| Damage Calc as main page | Task 1 (`/` → `/calculator`, Nav reorder) |
| Center-align components | Task 1 (`items-center` wrapper, `max-w-2xl`) |
| UI/UX improvement | Task 7 (frontend-design skill pass) |
| Enter / Ctrl+Enter → submit | Task 6 (`useKeyboardShortcuts`, `onSubmit`) |
| Ctrl+K → focus search | Task 6 (`onSearch` on calc + teams) |
| OHKO odds | Tasks 3 + 4 (`calcOhkoOdds` + result card display) |
| Show modifiers breakdown | Tasks 3 + 4 (`baseDamage` + modifier chain UI) |
| Fix x4 type effectiveness | Task 2 (tests + label fix + chart verification) |
| Randomized battle toggle | Task 5 (toggle UI + sessionStorage + randomizeBattle) |
| Session storage persistence | Task 5 (`sessionStorage.getItem/setItem` for toggle) |
| Default toggle ON | Task 5 (`stored === null ? true : stored === "true"`) |

**Placeholder scan:** None — all code blocks are complete.

**Type consistency check:**
- `DamageResult.baseDamage` + `DamageResult.modifiedBeforeRandom` added in Task 3, consumed in Task 4's `DamageResultCard` ✓
- `DamageResultCard` gains `defenderBaseHp: number` prop in Task 4; `DamageCalculator` passes `defender.baseStats.hp` in Task 4 ✓
- `PokemonPicker` gains `onClear` + `inputRef` props in Task 6; both `<PokemonPicker>` usages in `DamageCalculator` pass them ✓
- `useKeyboardShortcuts` receives `ShortcutMap`; both `DamageCalculator` and `TeamBuilder` provide matching objects ✓
- `calcOhkoOdds` and `defenderHpAtL50` exported from `~/lib/ohko`, imported in `DamageResult.tsx` (Task 4) ✓
- `hasRandomized` ref added in Task 5; `useRef` already in import from Task 6 — ensure import includes it before Task 5 runs (add `useRef` to imports in Task 5, step 1) ✓
