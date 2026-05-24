# Items, Natures, TypeBadge Polish & Full Tab Chain Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add competitive items and natures to the damage calculator, polish TypeBadge visuals, and wire a complete 16-entry Tab focus chain covering every calculator field.

**Architecture:** Pure lib additions (`natures.ts`, `items.ts`) feed into `damage.ts` (extended signatures); two new UI components (`ItemSearch`, `NatureSelect`) slot into existing card slots; `BattleConfigPanel` and panel components gain ref props for Tab chain integration; `DamageCalculator` owns all state and wires the 16-entry chain through `useFocusChain`.

**Tech Stack:** React 19 · TypeScript · Tailwind CSS v4 · Next.js 15 App Router · existing `useFocusChain` hook

**Tab chain order:** `attacker-card → attacker-item → attacker-nature → defender-card → defender-item → defender-nature → move-area → attacker-ev → defender-ev → attacker-stage → defender-stage → weather → terrain → level-input → crit → burn`

---

### Task 1: TypeBadge Visual Polish

**Files:**
- Modify: `src/app/_components/TypeBadge.tsx`

- [ ] **Step 1: Apply antialiasing, inner ring, and shadow**

Replace the `<span>` className in `src/app/_components/TypeBadge.tsx` (line 33):

```tsx
// before
<span className={`${colour} ${padding} inline-block rounded-full font-semibold capitalize tracking-wide`}>

// after
<span className={`${colour} ${padding} inline-block rounded-full font-semibold capitalize tracking-wide antialiased ring-1 ring-inset ring-white/20 shadow-sm shadow-black/30`}>
```

- [ ] **Step 2: Verify**

Run: `pnpm typecheck`
Expected: 0 errors.

Visual check: open the calculator in `pnpm dev`. Type badges should look smoother with a subtle inner highlight ring and soft shadow.

- [ ] **Step 3: Commit**

```bash
git add src/app/_components/TypeBadge.tsx
git commit -m "feat(ui): TypeBadge anti-aliasing, inner ring, depth shadow"
```

---

### Task 2: Nature Data (`src/lib/natures.ts`)

**Files:**
- Create: `src/lib/natures.ts`

- [ ] **Step 1: Create the file**

```typescript
// src/lib/natures.ts

export type StatKey = "attack" | "defense" | "spAttack" | "spDefense" | "speed";

export type NatureKey =
  | "hardy" | "lonely" | "brave" | "adamant" | "naughty"
  | "bold"  | "docile" | "relaxed" | "impish" | "lax"
  | "timid" | "hasty"  | "serious" | "jolly"  | "naive"
  | "modest" | "mild"  | "quiet"   | "bashful" | "rash"
  | "calm"  | "gentle" | "sassy"   | "careful" | "quirky";

// [boosted stat, lowered stat] — null = neutral
const NATURE_EFFECTS: Record<NatureKey, [StatKey | null, StatKey | null]> = {
  hardy:   [null,        null],
  lonely:  ["attack",   "defense"],
  brave:   ["attack",   "speed"],
  adamant: ["attack",   "spAttack"],
  naughty: ["attack",   "spDefense"],
  bold:    ["defense",  "attack"],
  docile:  [null,        null],
  relaxed: ["defense",  "speed"],
  impish:  ["defense",  "spAttack"],
  lax:     ["defense",  "spDefense"],
  timid:   ["speed",    "attack"],
  hasty:   ["speed",    "defense"],
  serious: [null,        null],
  jolly:   ["speed",    "spAttack"],
  naive:   ["speed",    "spDefense"],
  modest:  ["spAttack", "attack"],
  mild:    ["spAttack", "defense"],
  quiet:   ["spAttack", "speed"],
  bashful: [null,        null],
  rash:    ["spAttack", "spDefense"],
  calm:    ["spDefense", "attack"],
  gentle:  ["spDefense", "defense"],
  sassy:   ["spDefense", "speed"],
  careful: ["spDefense", "spAttack"],
  quirky:  [null,        null],
};

export function getNatureMult(nature: NatureKey, stat: StatKey): number {
  const [boosted, lowered] = NATURE_EFFECTS[nature];
  if (boosted === stat) return 1.1;
  if (lowered === stat)  return 0.9;
  return 1.0;
}

export function getNatureModifiedStats(nature: NatureKey): { boosted: StatKey | null; lowered: StatKey | null } {
  const [boosted, lowered] = NATURE_EFFECTS[nature];
  return { boosted, lowered };
}

export const NATURE_KEYS: NatureKey[] = [
  "hardy", "lonely", "brave", "adamant", "naughty",
  "bold",  "docile", "relaxed", "impish", "lax",
  "timid", "hasty",  "serious", "jolly",  "naive",
  "modest", "mild",  "quiet",   "bashful", "rash",
  "calm",  "gentle", "sassy",   "careful", "quirky",
];
```

- [ ] **Step 2: Verify**

Run: `pnpm typecheck`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/natures.ts
git commit -m "feat(data): nature multiplier table + getNatureMult helper"
```

---

### Task 3: Extend `damage.ts` for Nature and Item Multipliers

**Files:**
- Modify: `src/lib/damage.ts`

- [ ] **Step 1: Update `calcEffectiveStat` to accept optional nature multiplier**

Replace the existing `calcEffectiveStat` function (line 46–48 of `src/lib/damage.ts`):

```typescript
// before
export function calcEffectiveStat(base: number, ev: number, level: number): number {
  return Math.floor(Math.floor((2 * base + Math.floor(ev / 4)) * level / 100) + 5);
}

// after
export function calcEffectiveStat(base: number, ev: number, level: number, natureMult = 1): number {
  return Math.floor((Math.floor((2 * base + Math.floor(ev / 4)) * level / 100) + 5) * natureMult);
}
```

- [ ] **Step 2: Add `attackerDamageMult` to `DamageInput` and `itemMult` to `DamageResult`**

Replace the interfaces at lines 3–28:

```typescript
export interface DamageInput {
  level: number;
  power: number;
  attackStat: number;
  defenseStat: number;
  stab: boolean;
  typeEffectiveness: number;
  moveType?: PokemonType;
  weather?: Weather;
  terrain?: Terrain;
  isCritical?: boolean;
  attackerDamageMult?: number;
}

export interface DamageResult {
  min: number;
  max: number;
  average: number;
  stab: number;
  typeEffectiveness: number;
  baseDamage: number;
  modifiedBeforeRandom: number;
  weatherMult: number;
  terrainMult: number;
  critMult: number;
  itemMult?: number;
  stageMult?: number;
}
```

- [ ] **Step 3: Apply `attackerDamageMult` inside `calculateDamage`**

Replace the `calculateDamage` function body (lines 55–75):

```typescript
export function calculateDamage(input: DamageInput): DamageResult {
  const { level, power, attackStat, defenseStat, stab, typeEffectiveness, moveType, weather, terrain, isCritical, attackerDamageMult } = input;
  const stabMult    = stab ? 1.5 : 1.0;
  const weatherMult = getWeatherMult(weather, moveType);
  const terrainMult = getTerrainMult(terrain, moveType);
  const critMult    = isCritical ? 1.5 : 1.0;
  const itemMult    = attackerDamageMult ?? 1;
  const base     = (((2 * level) / 5 + 2) * power * (attackStat / defenseStat)) / 50 + 2;
  const modified = base * stabMult * typeEffectiveness * weatherMult * terrainMult * critMult * itemMult;
  return {
    min: Math.floor(modified * 0.85),
    max: Math.floor(modified),
    average: Math.floor(modified * 0.925),
    stab: stabMult,
    typeEffectiveness,
    baseDamage: Math.floor(base),
    modifiedBeforeRandom: modified,
    weatherMult,
    terrainMult,
    critMult,
    itemMult: itemMult !== 1 ? itemMult : undefined,
  };
}
```

- [ ] **Step 4: Verify**

Run: `pnpm typecheck`
Expected: 0 errors. Callers of `calcEffectiveStat` in `DamageCalculator.tsx` will still work because `natureMult` defaults to `1`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/damage.ts
git commit -m "feat(calc): extend damage.ts — nature mult in calcEffectiveStat, attackerDamageMult in calculateDamage"
```

---

### Task 4: Item Data (`src/lib/items.ts`)

**Files:**
- Create: `src/lib/items.ts`

- [ ] **Step 1: Create the file**

```typescript
// src/lib/items.ts
import { type PokemonType } from "~/lib/types";

export type ItemEffect =
  | { type: "attack_mult";  mult: number; category: "physical" | "special" | "any" }
  | { type: "defense_mult"; mult: number }
  | { type: "damage_mult";  mult: number; superEffectiveOnly?: boolean }
  | { type: "type_boost";   poketype: PokemonType; mult: number }
  | { type: "none" };

export interface CompetitiveItem {
  slug: string;
  name: string;
  spriteUrl: string;
  effect: ItemEffect;
}

const SPRITE = (slug: string) =>
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${slug}.png`;

export const COMPETITIVE_ITEMS: CompetitiveItem[] = [
  // ── Attack stat multipliers ──────────────────────────────────────────────────
  { slug: "choice-band",    name: "Choice Band",    spriteUrl: SPRITE("choice-band"),    effect: { type: "attack_mult", mult: 1.5, category: "physical" } },
  { slug: "choice-specs",   name: "Choice Specs",   spriteUrl: SPRITE("choice-specs"),   effect: { type: "attack_mult", mult: 1.5, category: "special" } },
  // ── Final damage multipliers ─────────────────────────────────────────────────
  { slug: "life-orb",       name: "Life Orb",       spriteUrl: SPRITE("life-orb"),       effect: { type: "damage_mult", mult: 1.3 } },
  { slug: "expert-belt",    name: "Expert Belt",    spriteUrl: SPRITE("expert-belt"),    effect: { type: "damage_mult", mult: 1.2, superEffectiveOnly: true } },
  // ── Defender: special defense multiplier ─────────────────────────────────────
  { slug: "assault-vest",   name: "Assault Vest",   spriteUrl: SPRITE("assault-vest"),   effect: { type: "defense_mult", mult: 1.5 } },
  // ── Type-boosting held items ─────────────────────────────────────────────────
  { slug: "charcoal",       name: "Charcoal",       spriteUrl: SPRITE("charcoal"),       effect: { type: "type_boost", poketype: "fire",     mult: 1.2 } },
  { slug: "mystic-water",   name: "Mystic Water",   spriteUrl: SPRITE("mystic-water"),   effect: { type: "type_boost", poketype: "water",    mult: 1.2 } },
  { slug: "miracle-seed",   name: "Miracle Seed",   spriteUrl: SPRITE("miracle-seed"),   effect: { type: "type_boost", poketype: "grass",    mult: 1.2 } },
  { slug: "magnet",         name: "Magnet",         spriteUrl: SPRITE("magnet"),         effect: { type: "type_boost", poketype: "electric", mult: 1.2 } },
  { slug: "nevermeltice",   name: "NeverMeltIce",   spriteUrl: SPRITE("nevermeltice"),   effect: { type: "type_boost", poketype: "ice",      mult: 1.2 } },
  { slug: "black-belt",     name: "Black Belt",     spriteUrl: SPRITE("black-belt"),     effect: { type: "type_boost", poketype: "fighting", mult: 1.2 } },
  { slug: "poison-barb",    name: "Poison Barb",    spriteUrl: SPRITE("poison-barb"),    effect: { type: "type_boost", poketype: "poison",   mult: 1.2 } },
  { slug: "soft-sand",      name: "Soft Sand",      spriteUrl: SPRITE("soft-sand"),      effect: { type: "type_boost", poketype: "ground",   mult: 1.2 } },
  { slug: "sharp-beak",     name: "Sharp Beak",     spriteUrl: SPRITE("sharp-beak"),     effect: { type: "type_boost", poketype: "flying",   mult: 1.2 } },
  { slug: "twisted-spoon",  name: "Twisted Spoon",  spriteUrl: SPRITE("twisted-spoon"),  effect: { type: "type_boost", poketype: "psychic",  mult: 1.2 } },
  { slug: "silverpowder",   name: "SilverPowder",   spriteUrl: SPRITE("silverpowder"),   effect: { type: "type_boost", poketype: "bug",      mult: 1.2 } },
  { slug: "hard-stone",     name: "Hard Stone",     spriteUrl: SPRITE("hard-stone"),     effect: { type: "type_boost", poketype: "rock",     mult: 1.2 } },
  { slug: "spell-tag",      name: "Spell Tag",      spriteUrl: SPRITE("spell-tag"),      effect: { type: "type_boost", poketype: "ghost",    mult: 1.2 } },
  { slug: "dragon-fang",    name: "Dragon Fang",    spriteUrl: SPRITE("dragon-fang"),    effect: { type: "type_boost", poketype: "dragon",   mult: 1.2 } },
  { slug: "black-glasses",  name: "BlackGlasses",   spriteUrl: SPRITE("black-glasses"),  effect: { type: "type_boost", poketype: "dark",     mult: 1.2 } },
  { slug: "metal-coat",     name: "Metal Coat",     spriteUrl: SPRITE("metal-coat"),     effect: { type: "type_boost", poketype: "steel",    mult: 1.2 } },
  { slug: "fairy-feather",  name: "Fairy Feather",  spriteUrl: SPRITE("fairy-feather"),  effect: { type: "type_boost", poketype: "fairy",    mult: 1.2 } },
];

export function getItemAttackMult(item: CompetitiveItem, moveCategory: string): number {
  const { effect } = item;
  if (effect.type !== "attack_mult") return 1;
  if (effect.category === "any") return effect.mult;
  if (effect.category === "physical" && moveCategory === "physical") return effect.mult;
  if (effect.category === "special"  && moveCategory === "special")  return effect.mult;
  return 1;
}

export function getItemDefenseMult(item: CompetitiveItem, moveCategory: string): number {
  const { effect } = item;
  if (effect.type === "defense_mult" && moveCategory === "special") return effect.mult;
  return 1;
}

export function getItemDamageMult(
  item: CompetitiveItem,
  moveType: PokemonType,
  typeEffectiveness: number,
): number {
  const { effect } = item;
  if (effect.type === "damage_mult") {
    if (effect.superEffectiveOnly && typeEffectiveness <= 1) return 1;
    return effect.mult;
  }
  if (effect.type === "type_boost" && effect.poketype === moveType) return effect.mult;
  return 1;
}
```

- [ ] **Step 2: Verify**

Run: `pnpm typecheck`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/items.ts
git commit -m "feat(data): competitive items table + attack/defense/damage mult helpers"
```

---

### Task 5: `ItemSearch` Component

**Files:**
- Create: `src/app/calculator/_components/ItemSearch.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/app/calculator/_components/ItemSearch.tsx
"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import Image from "next/image";
import { COMPETITIVE_ITEMS, type CompetitiveItem } from "~/lib/items";

interface ItemSearchProps {
  value: CompetitiveItem | null;
  onChange: (item: CompetitiveItem | null) => void;
  containerRef?: React.RefObject<HTMLInputElement | null>;
}

export function ItemSearch({ value, onChange, containerRef }: ItemSearchProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return COMPETITIVE_ITEMS.filter(i => i.name.toLowerCase().includes(q)).slice(0, 20);
  }, [query]);

  if (value) {
    return (
      <div className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900 px-2.5 py-1.5">
        {value.spriteUrl && (
          <Image src={value.spriteUrl} alt={value.name} width={18} height={18} unoptimized className="shrink-0" />
        )}
        <span className="flex-1 truncate text-xs text-zinc-300">{value.name}</span>
        <button
          onClick={() => onChange(null)}
          className="shrink-0 text-zinc-600 transition hover:text-red-400"
          aria-label="Remove item"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div ref={wrapperRef} className="relative">
      <input
        ref={containerRef}
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder="Item…"
        className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-xs text-white placeholder-zinc-600 outline-none transition focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30"
      />
      {open && filtered.length > 0 && (
        <ul className="absolute top-full z-20 mt-1 max-h-44 w-full overflow-y-auto rounded-xl border border-zinc-700 bg-zinc-950 py-1 shadow-2xl">
          {filtered.map(item => (
            <li key={item.slug}>
              <button
                onClick={() => { onChange(item); setQuery(""); setOpen(false); }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition hover:bg-zinc-800"
              >
                {item.spriteUrl && (
                  <Image src={item.spriteUrl} alt={item.name} width={16} height={16} unoptimized className="shrink-0" />
                )}
                <span className="text-zinc-300">{item.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify**

Run: `pnpm typecheck`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/calculator/_components/ItemSearch.tsx
git commit -m "feat(ui): ItemSearch — competitive item dropdown with PokeAPI sprites"
```

---

### Task 6: `NatureSelect` Component

**Files:**
- Create: `src/app/calculator/_components/NatureSelect.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/app/calculator/_components/NatureSelect.tsx
"use client";

import { type NatureKey, NATURE_KEYS, getNatureModifiedStats } from "~/lib/natures";

interface NatureSelectProps {
  value: NatureKey;
  onChange: (nature: NatureKey) => void;
  containerRef?: React.RefObject<HTMLSelectElement | null>;
}

const STAT_LABEL: Record<string, string> = {
  attack:   "Atk",
  defense:  "Def",
  spAttack: "SpA",
  spDefense:"SpD",
  speed:    "Spe",
};

export function NatureSelect({ value, onChange, containerRef }: NatureSelectProps) {
  const { boosted, lowered } = getNatureModifiedStats(value);

  return (
    <div className="flex items-center gap-1.5">
      <select
        ref={containerRef}
        value={value}
        onChange={e => onChange(e.target.value as NatureKey)}
        className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-xs text-white outline-none transition focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 capitalize"
      >
        {NATURE_KEYS.map(n => (
          <option key={n} value={n} className="capitalize">
            {n.charAt(0).toUpperCase() + n.slice(1)}
          </option>
        ))}
      </select>
      <div className="flex shrink-0 flex-col text-[9px] font-semibold leading-tight">
        {boosted ? (
          <span className="text-green-400">+{STAT_LABEL[boosted]}</span>
        ) : (
          <span className="text-zinc-700">—</span>
        )}
        {lowered && <span className="text-red-400">−{STAT_LABEL[lowered]}</span>}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify**

Run: `pnpm typecheck`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/calculator/_components/NatureSelect.tsx
git commit -m "feat(ui): NatureSelect — compact nature dropdown with +/- stat labels"
```

---

### Task 7: Show Item Modifier Pill in `DamageResult.tsx`

**Files:**
- Modify: `src/app/calculator/_components/DamageResult.tsx`

- [ ] **Step 1: Insert item pill after the crit pill in the modifier chain**

In `src/app/calculator/_components/DamageResult.tsx`, find the crit pill block (lines 101–106) and insert the item pill after it:

```tsx
// Existing crit block (lines 101-106) — unchanged:
{result.critMult !== 1 && (
  <>
    <span className="text-[11px] text-zinc-700">×</span>
    <ModifierPill label="Crit" value={`×${result.critMult}`} highlight />
  </>
)}
// ADD THIS after the crit block, before the stageMult block:
{result.itemMult !== undefined && (
  <>
    <span className="text-[11px] text-zinc-700">×</span>
    <ModifierPill label="Item" value={`×${result.itemMult}`} highlight />
  </>
)}
{result.stageMult !== undefined && result.stageMult !== 1 && (
```

- [ ] **Step 2: Verify**

Run: `pnpm typecheck`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/calculator/_components/DamageResult.tsx
git commit -m "feat(ui): show item multiplier pill in damage modifier chain"
```

---

### Task 8: `BattleConfigPanel.tsx` — Keyboard Refs and PillGrid Focus

**Files:**
- Modify: `src/app/calculator/_components/BattleConfigPanel.tsx`

- [ ] **Step 1: Add keyboard support to `PillGrid` and `buttonRef` to `ToggleButton`**

Replace the entire file content:

```tsx
"use client";

import React, { useState } from "react";
import { type BattleConfig, type Weather, type Terrain } from "~/lib/types";

// ─── Pill definitions (no "none" — clicking active deselects) ─────────────────

const WEATHER_OPTIONS: { value: Weather; label: string; activeClass: string }[] = [
  { value: "sun",       label: "Harsh Sun",  activeClass: "border-orange-500/80 bg-orange-900/50 text-orange-200" },
  { value: "rain",      label: "Rain",       activeClass: "border-blue-500/80   bg-blue-900/50   text-blue-200" },
  { value: "sandstorm", label: "Sandstorm",  activeClass: "border-amber-500/80  bg-amber-900/50  text-amber-200" },
  { value: "hail",      label: "Hail",       activeClass: "border-cyan-500/80   bg-cyan-900/50   text-cyan-200" },
];

const TERRAIN_OPTIONS: { value: Terrain; label: string; activeClass: string }[] = [
  { value: "electric", label: "Electric",   activeClass: "border-yellow-500/80 bg-yellow-900/50 text-yellow-200" },
  { value: "grassy",   label: "Grassy",     activeClass: "border-green-500/80  bg-green-900/50  text-green-200" },
  { value: "psychic",  label: "Psychic",    activeClass: "border-purple-500/80 bg-purple-900/50 text-purple-200" },
  { value: "misty",    label: "Misty",      activeClass: "border-pink-500/80   bg-pink-900/50   text-pink-200" },
];

const PILL_INACTIVE = "border-zinc-800 bg-zinc-900/60 text-zinc-600 hover:border-zinc-700 hover:text-zinc-400";

// ─── 2×2 pill grid ────────────────────────────────────────────────────────────

interface PillGridProps<T extends string> {
  label: string;
  options: { value: T; label: string; activeClass: string }[];
  selected: T | "none";
  onSelect: (value: T | "none") => void;
  containerRef?: React.RefObject<HTMLDivElement | null>;
}

function PillGrid<T extends string>({ label, options, selected, onSelect, containerRef }: PillGridProps<T>) {
  const [kbIndex, setKbIndex] = useState(-1);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      setKbIndex(i => (i + 1) % options.length);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      setKbIndex(i => (i - 1 + options.length) % options.length);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const idx = kbIndex >= 0 ? kbIndex : 0;
      const opt = options[idx];
      if (opt) onSelect(opt.value === selected ? "none" : opt.value);
    }
  }

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onFocus={() => setKbIndex(0)}
      onBlur={() => setKbIndex(-1)}
      onKeyDown={handleKeyDown}
      className="flex flex-1 flex-col gap-1.5 rounded-lg outline-none focus:ring-1 focus:ring-violet-500/40 focus:ring-offset-1 focus:ring-offset-zinc-950"
    >
      <span className="text-xs font-medium text-zinc-500">{label}</span>
      <div className="grid grid-cols-2 gap-1.5">
        {options.map((o, i) => (
          <button
            key={o.value}
            tabIndex={-1}
            onClick={() => onSelect(o.value === selected ? "none" : o.value)}
            aria-pressed={o.value === selected}
            className={`rounded-lg border px-2 py-1.5 text-center text-[11px] font-medium leading-tight transition ${
              o.value === selected ? o.activeClass : PILL_INACTIVE
            } ${kbIndex === i ? "ring-1 ring-violet-500/60" : ""}`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Toggle button ────────────────────────────────────────────────────────────

interface ToggleButtonProps {
  label: string;
  active: boolean;
  onToggle: () => void;
  activeClass: string;
  icon: React.ReactNode;
  activeLabel: string;
  inactiveLabel: string;
  buttonRef?: React.RefObject<HTMLButtonElement | null>;
}

function ToggleButton({ label, active, onToggle, activeClass, icon, activeLabel, inactiveLabel, buttonRef }: ToggleButtonProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-zinc-500">{label}</span>
      <button
        ref={buttonRef}
        role="switch"
        aria-checked={active}
        onClick={onToggle}
        className={`flex h-[34px] items-center justify-center gap-1.5 rounded-xl border px-3 text-xs font-medium transition ${active
          ? activeClass
          : "border-zinc-800 bg-zinc-900 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300"
          }`}
      >
        {icon}
        <span>{active ? activeLabel : inactiveLabel}</span>
      </button>
    </div>
  );
}

// ─── Panel ────────────────────────────────────────────────────────────────────

interface BattleConfigPanelProps {
  config: BattleConfig;
  onChange: (config: BattleConfig) => void;
  levelInputRef?: React.RefObject<HTMLInputElement | null>;
  weatherRef?: React.RefObject<HTMLDivElement | null>;
  terrainRef?: React.RefObject<HTMLDivElement | null>;
  critRef?: React.RefObject<HTMLButtonElement | null>;
  burnRef?: React.RefObject<HTMLButtonElement | null>;
}

export function BattleConfigPanel({ config, onChange, levelInputRef, weatherRef, terrainRef, critRef, burnRef }: BattleConfigPanelProps) {
  function update<K extends keyof BattleConfig>(key: K, value: BattleConfig[K]) {
    onChange({ ...config, [key]: value });
  }

  const hasActive = config.weather !== "none" || config.terrain !== "none" || config.isCritical || config.attackerBurned;

  return (
    <div className="glass-card p-4">
      <span className="mb-3 block text-[11px] font-semibold uppercase tracking-widest text-zinc-600">
        Battle Config
      </span>

      <div className="flex flex-col gap-3">

        {/* Weather + Terrain grids side by side */}
        <div className="flex gap-4">
          <PillGrid
            label="Weather"
            options={WEATHER_OPTIONS}
            selected={config.weather}
            onSelect={v => update("weather", v as Weather)}
            containerRef={weatherRef}
          />
          <PillGrid
            label="Terrain"
            options={TERRAIN_OPTIONS}
            selected={config.terrain}
            onSelect={v => update("terrain", v as Terrain)}
            containerRef={terrainRef}
          />
        </div>

        {/* Level + toggles */}
        <div className="flex gap-2 w-full">
          <div className="w-full md:w-1/2 flex items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-zinc-500">Level</span>
              <input
                ref={levelInputRef}
                type="number"
                min={1}
                max={100}
                value={config.level}
                onChange={e => {
                  const v = Math.max(1, Math.min(100, Number(e.target.value) || 50));
                  update("level", v);
                }}
                className="w-16 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-center text-sm text-white outline-none transition hover:border-zinc-600 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
            </div>

            <ToggleButton
              label="Critical Hit"
              active={config.isCritical}
              onToggle={() => update("isCritical", !config.isCritical)}
              activeClass="border-yellow-600/60 bg-yellow-900/30 text-yellow-300"
              buttonRef={critRef}
              icon={
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              }
              activeLabel="Crit"
              inactiveLabel="Crit"
            />

            <ToggleButton
              label="Burn"
              active={config.attackerBurned}
              onToggle={() => update("attackerBurned", !config.attackerBurned)}
              activeClass="border-orange-600/60 bg-orange-900/30 text-orange-300"
              buttonRef={burnRef}
              icon={
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
                </svg>
              }
              activeLabel="Burned"
              inactiveLabel="Burned"
            />
          </div>

          {/* Active modifier effect hints */}
          {hasActive && (
            <div className="w-full h-15 px-2 mt-3 flex flex-wrap gap-0.5">
              {config.weather !== "none" && (
                <span className="h-5 rounded-lg bg-blue-950/50 px-2 py-0.5 text-xs font-medium text-blue-300 ring-1 ring-blue-800/50">
                  {config.weather === "sun" ? "Fire ×1.5 · Water ×0.5" :
                    config.weather === "rain" ? "Water ×1.5 · Fire ×0.5" :
                      config.weather}
                </span>
              )}
              {config.terrain !== "none" && (
                <span className="h-5 rounded-lg bg-green-950/50 px-2 py-0.5 text-xs font-medium text-green-300 ring-1 ring-green-800/50">
                  {config.terrain === "electric" ? "Electric ×1.3" :
                    config.terrain === "grassy" ? "Grass ×1.3" :
                      config.terrain === "psychic" ? "Psychic ×1.3" :
                        config.terrain === "misty" ? "Dragon ×0.5" :
                          config.terrain}
                </span>
              )}
              {config.isCritical && (
                <span className="h-5 rounded-lg bg-yellow-950/50 px-2 py-0.5 text-xs font-medium text-yellow-300 ring-1 ring-yellow-800/50">
                  Crit ×1.5
                </span>
              )}
              {config.attackerBurned && (
                <span className="h-5 rounded-lg bg-orange-950/50 px-2 py-0.5 text-xs font-medium text-orange-300 ring-1 ring-orange-800/50">
                  Burn: Phys. Atk ÷2
                </span>
              )}
            </div>
          )}

        </div>
      </div>

    </div>
  );
}
```

- [ ] **Step 2: Verify**

Run: `pnpm typecheck`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/calculator/_components/BattleConfigPanel.tsx
git commit -m "feat(ux): BattleConfigPanel — weather/terrain arrow-key cycling, crit/burn buttonRef props"
```

---

### Task 9: `StatStagePanel.tsx` — Add `containerRef`

**Files:**
- Modify: `src/app/calculator/_components/StatStagePanel.tsx`

- [ ] **Step 1: Add `containerRef` prop and `tabIndex` to outer div**

Replace `StatStagePanelProps` interface and the `StatStagePanel` export:

```typescript
// Replace from the `interface StatStat` through the end of the file

interface StatStat {
  key: string;
  label: string;
}

interface StatStagePanelProps {
  stats: StatStat[];
  stages: Record<string, number>;
  activeKey?: string;
  onChange: (key: string, value: number) => void;
  kbFocused?: boolean;
  containerRef?: React.RefObject<HTMLDivElement | null>;
}

export function StatStagePanel({ stats, stages, activeKey, onChange, kbFocused, containerRef }: StatStagePanelProps) {
  return (
    <div
      ref={containerRef}
      tabIndex={containerRef ? 0 : undefined}
      className={`flex flex-col gap-2.5 rounded-xl border px-3 py-2.5 backdrop-blur-sm transition outline-none ${
        kbFocused
          ? "border-violet-500/60 bg-zinc-800/30 ring-1 ring-violet-500/20"
          : "border-zinc-700/40 bg-zinc-800/20"
      }`}
    >
      <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600">Stages</span>
      {stats.map(({ key, label }) => (
        <StatStageRow
          key={key}
          label={label}
          statKey={key}
          stage={stages[key] ?? 0}
          isActive={key === activeKey}
          onChange={onChange}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Verify**

Run: `pnpm typecheck`
Expected: 0 errors (existing callers pass no `containerRef`, so `tabIndex` stays `undefined` for them — browser ignores `tabIndex={undefined}`).

- [ ] **Step 3: Commit**

```bash
git add src/app/calculator/_components/StatStagePanel.tsx
git commit -m "feat(ux): StatStagePanel — containerRef + tabIndex for Tab chain integration"
```

---

### Task 10: Full `DamageCalculator.tsx` Wiring

**Files:**
- Modify: `src/app/calculator/_components/DamageCalculator.tsx`

This is the largest task. Apply changes in the order listed.

- [ ] **Step 1: Add new imports at the top of the file**

After the existing imports, add:

```typescript
import { getNatureMult, type NatureKey } from "~/lib/natures";
import { getItemAttackMult, getItemDefenseMult, getItemDamageMult, type CompetitiveItem } from "~/lib/items";
import { ItemSearch } from "./ItemSearch";
import { NatureSelect } from "./NatureSelect";
```

- [ ] **Step 2: Add `natureMults` prop to `EvPanel`**

Replace the `EvPanelProps` interface and `EvPanel` function (lines 31–84):

```typescript
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
  containerRef?: React.RefObject<HTMLDivElement | null>;
  natureMults?: Record<string, number>;
}

function EvPanel({ stats, evs, level, activeKey, onChange, kbFocused, containerRef, natureMults }: EvPanelProps) {
  return (
    <div
      ref={containerRef}
      tabIndex={containerRef ? 0 : undefined}
      className={`flex flex-col gap-3 rounded-xl border px-3 py-2.5 backdrop-blur-sm transition outline-none ${kbFocused
        ? "border-violet-500/60 bg-zinc-800/30 ring-1 ring-violet-500/20"
        : "border-zinc-700/40 bg-zinc-800/20"
        }`}
    >
      <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600">EVs</span>
      {stats.map(({ key, label, base }) => {
        const ev = evs[key] ?? 0;
        const natureMult = natureMults?.[key] ?? 1;
        const effective = calcEffectiveStat(base, ev, level, natureMult);
        const isActive = key === activeKey;
        return (
          <div key={key} className={`flex flex-col gap-1 transition-opacity ${isActive ? "opacity-100" : "opacity-40"}`}>
            <div className="flex items-center justify-between">
              <span className={`text-[11px] font-medium ${isActive ? "text-zinc-300" : "text-zinc-500"}`}>
                {label}
              </span>
              <div className="flex items-center gap-2.5">
                <span className="text-[10px] tabular-nums text-zinc-600">{ev} EV</span>
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
```

- [ ] **Step 3: Add `item` prop to `PokemonSlotCard` for item icon display**

In the `PokemonSlotCardProps` interface (around line 88), add:

```typescript
interface PokemonSlotCardProps {
  label: string;
  value: PokemonSummary | null;
  isLoading?: boolean;
  onOpenPicker: () => void;
  containerRef?: React.RefObject<HTMLDivElement | null>;
  kbHighlighted?: boolean;
  item?: CompetitiveItem | null;
}
```

In the filled card state inside `PokemonSlotCard`, find the sprite area div and add the item icon badge:

```tsx
{/* Replace the sprite area (the relative div containing the Image) with: */}
<div className="relative flex h-20 w-20 items-center justify-center rounded-xl bg-zinc-800/80">
  <Image
    src={value.sprite}
    alt={value.name}
    width={72}
    height={72}
    unoptimized
    className={`drop-shadow-lg transition-transform duration-200 ${kbHighlighted ? "scale-105" : "group-hover:scale-105"}`}
  />
  {item?.spriteUrl && (
    <div className="absolute -right-1 -bottom-1 flex h-6 w-6 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 shadow-sm">
      <Image src={item.spriteUrl} alt={item.name} width={16} height={16} unoptimized />
    </div>
  )}
</div>
```

- [ ] **Step 4: Add new state variables and refs inside `DamageCalculator`**

After the existing `const levelInputRef = useRef<HTMLInputElement>(null);` line (around line 216), add:

```typescript
const [attackerItem, setAttackerItem] = useState<CompetitiveItem | null>(null);
const [defenderItem, setDefenderItem] = useState<CompetitiveItem | null>(null);
const [attackerNature, setAttackerNature] = useState<NatureKey>("hardy");
const [defenderNature, setDefenderNature] = useState<NatureKey>("hardy");

const attackerItemRef    = useRef<HTMLInputElement>(null);
const attackerNatureRef  = useRef<HTMLSelectElement>(null);
const defenderItemRef    = useRef<HTMLInputElement>(null);
const defenderNatureRef  = useRef<HTMLSelectElement>(null);
const attackerEvRef      = useRef<HTMLDivElement>(null);
const defenderEvRef      = useRef<HTMLDivElement>(null);
const attackerStageRef   = useRef<HTMLDivElement>(null);
const defenderStageRef   = useRef<HTMLDivElement>(null);
const weatherRef         = useRef<HTMLDivElement>(null);
const terrainRef         = useRef<HTMLDivElement>(null);
const critRef            = useRef<HTMLButtonElement>(null);
const burnRef            = useRef<HTMLButtonElement>(null);
```

- [ ] **Step 5: Update the damage calculation `useEffect` to apply natures and items**

Replace the auto-calculate `useEffect` (starting at `useEffect(() => {` around line 226 through `}, [attacker, defender, move, battleConfig, attackerEvs, defenderEvs, attackerStages, defenderStages]);`):

```typescript
useEffect(() => {
  if (!attacker || !defender || !move || !move.power) {
    setResult(null);
    return;
  }

  const level = battleConfig.level;
  const isPhysical = move.category === "physical";
  const isSpecial  = move.category === "special";

  const attackKey  = isPhysical ? "attack"   : "spAttack";
  const defenseKey = isPhysical ? "defense"  : "spDefense";

  let attackStat = isPhysical
    ? calcEffectiveStat(attacker.baseStats.attack,    attackerEvs.attack    ?? 0, level, getNatureMult(attackerNature, "attack"))
    : isSpecial
      ? calcEffectiveStat(attacker.baseStats.spAttack, attackerEvs.spAttack ?? 0, level, getNatureMult(attackerNature, "spAttack"))
      : 0;

  let defenseStat = isPhysical
    ? calcEffectiveStat(defender.baseStats.defense,   defenderEvs.defense   ?? 0, level, getNatureMult(defenderNature, "defense"))
    : isSpecial
      ? calcEffectiveStat(defender.baseStats.spDefense, defenderEvs.spDefense ?? 0, level, getNatureMult(defenderNature, "spDefense"))
      : 0;

  const atkStageMult = getStatStageMult(attackerStages[attackKey]  ?? 0);
  const defStageMult = getStatStageMult(defenderStages[defenseKey] ?? 0);
  attackStat  = Math.floor(attackStat  * atkStageMult);
  defenseStat = Math.floor(defenseStat * defStageMult);

  if (battleConfig.attackerBurned && isPhysical) {
    attackStat = Math.floor(attackStat / 2);
  }

  if (attackerItem) attackStat  = Math.floor(attackStat  * getItemAttackMult(attackerItem,  move.category));
  if (defenderItem) defenseStat = Math.floor(defenseStat * getItemDefenseMult(defenderItem, move.category));

  const stab = attacker.types.includes(move.type as PokemonType);
  const te   = getTypeEffectiveness(move.type as PokemonType, defender.types as PokemonType[]);

  const attackerDamageMult = attackerItem
    ? getItemDamageMult(attackerItem, move.type as PokemonType, te)
    : 1;

  const dmg = calculateDamage({
    level, power: move.power, attackStat, defenseStat, stab,
    typeEffectiveness: te, moveType: move.type as PokemonType,
    weather: battleConfig.weather, terrain: battleConfig.terrain,
    isCritical: battleConfig.isCritical, attackerDamageMult,
  });

  const combinedStage = atkStageMult * defStageMult;
  if (combinedStage !== 1) dmg.stageMult = combinedStage;

  setResult({ dmg, move });
}, [attacker, defender, move, battleConfig, attackerEvs, defenderEvs, attackerStages, defenderStages, attackerItem, defenderItem, attackerNature, defenderNature]);
```

- [ ] **Step 6: Update `focusChain` to the full 16-entry chain**

Replace the `focusChain` useMemo (around line 376–381):

```typescript
const focusChain = useMemo<FocusChainEntry[]>(() => [
  { id: "attacker-card",   getElement: () => attackerCardRef.current?.querySelector<HTMLElement>('[role="button"], button') ?? null },
  { id: "attacker-item",   getElement: () => attackerItemRef.current },
  { id: "attacker-nature", getElement: () => attackerNatureRef.current },
  { id: "defender-card",   getElement: () => defenderCardRef.current?.querySelector<HTMLElement>('[role="button"], button') ?? null },
  { id: "defender-item",   getElement: () => defenderItemRef.current },
  { id: "defender-nature", getElement: () => defenderNatureRef.current },
  { id: "move-area",       getElement: () => moveAreaRef.current?.querySelector<HTMLElement>('[role="button"][tabindex="0"], input') ?? null },
  { id: "attacker-ev",     getElement: () => attackerEvRef.current },
  { id: "defender-ev",     getElement: () => defenderEvRef.current },
  { id: "attacker-stage",  getElement: () => attackerStageRef.current },
  { id: "defender-stage",  getElement: () => defenderStageRef.current },
  { id: "weather",         getElement: () => weatherRef.current },
  { id: "terrain",         getElement: () => terrainRef.current },
  { id: "level-input",     getElement: () => levelInputRef.current },
  { id: "crit",            getElement: () => critRef.current },
  { id: "burn",            getElement: () => burnRef.current },
], []);
```

- [ ] **Step 7: Update `useFocusChain` callback to sync kbState across all 16 entries**

Replace the `useFocusChain(focusChain, ...)` call (around line 383–387):

The callback reads `move` from the closure (safe because `useFocusChain` uses a ref internally, so it always sees the latest value). When Tab lands on an EV or stage panel, it pre-selects the attribute that matches the current move's category so the user can immediately press arrow keys to edit.

```typescript
useFocusChain(focusChain, (id) => {
  const atkAttr = move?.category === "physical" ? "attack"  : move?.category === "special" ? "spAttack"  : null;
  const defAttr = move?.category === "physical" ? "defense" : move?.category === "special" ? "spDefense" : null;

  if (id === "attacker-card" || id === "attacker-item" || id === "attacker-nature") {
    setKbState({ slot: "attacker", panel: null, attribute: null });
  } else if (id === "defender-card" || id === "defender-item" || id === "defender-nature") {
    setKbState({ slot: "defender", panel: null, attribute: null });
  } else if (id === "attacker-ev") {
    setKbState({ slot: "attacker", panel: "ev", attribute: atkAttr });
  } else if (id === "defender-ev") {
    setKbState({ slot: "defender", panel: "ev", attribute: defAttr });
  } else if (id === "attacker-stage") {
    setKbState({ slot: "attacker", panel: "stage", attribute: atkAttr });
  } else if (id === "defender-stage") {
    setKbState({ slot: "defender", panel: "stage", attribute: defAttr });
  } else {
    setKbState({ slot: null, panel: null, attribute: null });
  }
});
```

- [ ] **Step 8: Make the keyboard shortcut hint clickable**

In the right column of `DamageCalculator`'s JSX, find the hint div (around line 560–564):

```tsx
{/* before */}
<div className="flex items-start justify-end gap-1.5 text-[11px] text-zinc-700">
  <kbd className="rounded bg-zinc-900 px-1.5 py-0.5 font-mono text-zinc-500">/</kbd>
  <span>Keyboard shortcuts</span>
</div>

{/* after */}
<button
  onClick={() => setHotkeyModalOpen(true)}
  className="flex items-center gap-1.5 text-[11px] text-zinc-700 transition hover:text-zinc-400"
>
  <kbd className="rounded bg-zinc-900 px-1.5 py-0.5 font-mono text-zinc-500">/</kbd>
  <span>Keyboard shortcuts</span>
</button>
```

- [ ] **Step 9: Compute `natureMults` maps for `EvPanel` display**

After the `attackerEvStats` / `defenderEvStats` arrays (around line 397–408), add:

```typescript
const attackerNatureMults: Record<string, number> = {
  attack:   getNatureMult(attackerNature, "attack"),
  spAttack: getNatureMult(attackerNature, "spAttack"),
};
const defenderNatureMults: Record<string, number> = {
  defense:   getNatureMult(defenderNature, "defense"),
  spDefense: getNatureMult(defenderNature, "spDefense"),
};
```

- [ ] **Step 10: Update the JSX — pokemon picker section with item + nature rows**

Find the `{/* Pokemon pickers */}` section (around line 463) and replace the outer div + PokemonSlotCard calls to add item/nature rows below each card:

```tsx
{/* Pokemon pickers */}
<div className="relative grid grid-cols-2 gap-3">
  {/* Attacker column */}
  <div className="flex flex-col gap-2">
    <PokemonSlotCard
      label="Attacker"
      value={attacker}
      isLoading={loadingAttacker}
      onOpenPicker={() => { setAttackerModalOpen(true); setKbState({ slot: null, panel: null, attribute: null }); }}
      containerRef={attackerCardRef}
      kbHighlighted={kbState.slot === "attacker"}
      item={attackerItem}
    />
    <ItemSearch value={attackerItem} onChange={setAttackerItem} containerRef={attackerItemRef} />
    <NatureSelect value={attackerNature} onChange={setAttackerNature} containerRef={attackerNatureRef} />
  </div>

  {/* VS badge */}
  <div className="pointer-events-none absolute top-1/2 left-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
    <div className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-700 bg-zinc-950 text-xs font-black tracking-tight text-zinc-500 shadow-lg">
      vs
    </div>
  </div>

  {/* Defender column */}
  <div className="flex flex-col gap-2">
    <PokemonSlotCard
      label="Defender"
      value={defender}
      isLoading={loadingDefender}
      onOpenPicker={() => { setDefenderModalOpen(true); setKbState({ slot: null, panel: null, attribute: null }); }}
      containerRef={defenderCardRef}
      kbHighlighted={kbState.slot === "defender"}
      item={defenderItem}
    />
    <ItemSearch value={defenderItem} onChange={setDefenderItem} containerRef={defenderItemRef} />
    <NatureSelect value={defenderNature} onChange={setDefenderNature} containerRef={defenderNatureRef} />
  </div>
</div>
```

- [ ] **Step 11: Pass `natureMults`, `containerRef` to `EvPanel` and `containerRef` to `StatStagePanel`**

In the EV panels + Stat stage panels section (around line 489), update the four component usages:

```tsx
<EvPanel
  stats={attackerEvStats}
  evs={attackerEvs}
  level={battleConfig.level}
  activeKey={effectiveAttackerKey}
  onChange={(key, val) => setAttackerEvs(prev => ({ ...prev, [key]: val }))}
  kbFocused={kbState.slot === "attacker" && kbState.panel === "ev"}
  containerRef={attackerEvRef}
  natureMults={attackerNatureMults}
/>
<StatStagePanel
  stats={attackerStageStats}
  stages={attackerStages}
  activeKey={effectiveAttackerKey}
  onChange={(key, val) => setAttackerStages(prev => ({ ...prev, [key]: val }))}
  kbFocused={kbState.slot === "attacker" && kbState.panel === "stage"}
  containerRef={attackerStageRef}
/>
```

```tsx
<EvPanel
  stats={defenderEvStats}
  evs={defenderEvs}
  level={battleConfig.level}
  activeKey={effectiveDefenderKey}
  onChange={(key, val) => setDefenderEvs(prev => ({ ...prev, [key]: val }))}
  kbFocused={kbState.slot === "defender" && kbState.panel === "ev"}
  containerRef={defenderEvRef}
  natureMults={defenderNatureMults}
/>
<StatStagePanel
  stats={defenderStageStats}
  stages={defenderStages}
  activeKey={effectiveDefenderKey}
  onChange={(key, val) => setDefenderStages(prev => ({ ...prev, [key]: val }))}
  kbFocused={kbState.slot === "defender" && kbState.panel === "stage"}
  containerRef={defenderStageRef}
/>
```

- [ ] **Step 11: Pass the new refs to `BattleConfigPanel`**

Replace the `<BattleConfigPanel` usage (around line 586):

```tsx
<BattleConfigPanel
  config={battleConfig}
  onChange={setBattleConfig}
  levelInputRef={levelInputRef}
  weatherRef={weatherRef}
  terrainRef={terrainRef}
  critRef={critRef}
  burnRef={burnRef}
/>
```

- [ ] **Step 12: Verify**

Run: `pnpm typecheck`
Expected: 0 errors.

- [ ] **Step 13: Commit**

```bash
git add src/app/calculator/_components/DamageCalculator.tsx
git commit -m "feat(calc): items + natures wired into damage calc, 16-entry Tab chain, nature EV display"
```

---

### Task 11: Update `HotkeyModal.tsx`

**Files:**
- Modify: `src/app/calculator/_components/HotkeyModal.tsx`

- [ ] **Step 1: Update the Tab cycle description and add weather/terrain shortcut note**

Replace the `SECTIONS` array:

```typescript
const SECTIONS = [
  {
    title: "Navigation",
    rows: [
      { keys: ["1", "2"],   desc: "Focus Attacker / Defender slot" },
      { keys: ["Enter"],    desc: "Open Pokémon picker for focused slot" },
      { keys: ["Tab"],      desc: "Cycle: Attacker → Item → Nature → Defender → Item → Nature → Move → EVs → Stages → Weather → Terrain → Level → Crit → Burn" },
      { keys: ["K"],        desc: "Open move picker" },
      { keys: ["Esc"],      desc: "Clear keyboard focus / close modal" },
    ],
  },
  {
    title: "Stat Editing",
    rows: [
      { keys: ["e"],         desc: "Select EV panel for focused slot" },
      { keys: ["b"],         desc: "Select Stages (Buffs) panel" },
      { keys: ["a", "↑"],   desc: "Highlight Physical stat (Attack / Defense)" },
      { keys: ["s", "↓"],   desc: "Highlight Special stat (Sp. Atk / Sp. Def)" },
      { keys: ["→", "+"],   desc: "Increase EV (+4) or Stage (+1)" },
      { keys: ["←", "−"],  desc: "Decrease EV (−4) or Stage (−1)" },
    ],
  },
  {
    title: "Weather & Terrain",
    rows: [
      { keys: ["↑", "↓"],   desc: "Cycle pills when Weather or Terrain is focused" },
      { keys: ["Enter"],    desc: "Toggle selected weather / terrain pill" },
    ],
  },
  {
    title: "Search Dropdowns",
    rows: [
      { keys: ["↑", "↓"],   desc: "Move through search results" },
      { keys: ["Enter"],    desc: "Select highlighted result" },
      { keys: ["1–0"],      desc: "Toggle type filter (inside Pokémon picker)" },
    ],
  },
  {
    title: "This cheat sheet",
    rows: [
      { keys: ["/"],         desc: "Open / close" },
      { keys: ["Esc"],       desc: "Close" },
    ],
  },
];
```

Note: The grid layout is currently `grid-cols-2`. With 5 sections, update to allow wrapping:

Replace `className="grid grid-cols-2 gap-px bg-zinc-800/40 p-px"` with `className="grid grid-cols-2 gap-px bg-zinc-800/40 p-px lg:grid-cols-3"` in the content div (line 103).

- [ ] **Step 2: Verify**

Run: `pnpm typecheck`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/calculator/_components/HotkeyModal.tsx
git commit -m "feat(ui): update hotkey modal — 16-entry Tab chain, weather/terrain keyboard section"
```

---

### Task 12: Champions Filter Toggle in `PokemonPickerModal.tsx`

**Files:**

- Modify: `src/app/calculator/_components/PokemonPickerModal.tsx`

Add a "Champions only" toggle (default ON) that restricts the search pool to the VGC Top 20. When ON and no query is typed, all 20 Champions are shown immediately. When OFF, the full DB is searched as before.

- [ ] **Step 1: Add `championsOnly` state and `championsSet` memo**

After the existing `const [sessionPicks, setSessionPicks] = useState<VgcPick[]>([]);` line (line 43), add:

```tsx
const [championsOnly, setChampionsOnly] = useState(true);
```

After `const { data: vgcData = [] } = ...` line (line 55), add:

```tsx
const championsSet = useMemo(() => new Set(vgcData.map(p => p.name)), [vgcData]);
```

- [ ] **Step 2: Update the `matches` useMemo to apply the Champions filter**

Replace the existing `matches` useMemo (lines 129–141):

```tsx
const matches = useMemo(() => {
  const hasQuery  = query.length >= 2;
  const hasFilter = typeFilters.length > 0;
  if (!hasQuery && !hasFilter && !championsOnly) return [];
  const q    = query.toLowerCase().replace(/\s/g, "-");
  const pool = championsOnly
    ? allSummaries.filter(s => championsSet.has(s.name))
    : allSummaries;
  return pool
    .filter(s => {
      const nameMatch = !hasQuery  || s.name.includes(q);
      const typeMatch = !hasFilter || typeFilters.every(f => s.types.includes(f));
      return nameMatch && typeMatch;
    })
    .slice(0, 20);
}, [query, allSummaries, typeFilters, championsOnly, championsSet]);
```

- [ ] **Step 3: Add the toggle button below the search input**

In the JSX, after the search input's closing `</div>` (line 247, after the `matches` dropdown), before `{/* Type filter bar */}`, add:

```tsx
{/* Champions filter toggle */}
<div className="mt-2 flex items-center justify-between">
  <button
    onClick={() => setChampionsOnly(v => !v)}
    className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-medium transition ${
      championsOnly
        ? "border-violet-500/60 bg-violet-900/20 text-violet-300"
        : "border-zinc-800 bg-zinc-900 text-zinc-500 hover:border-zinc-700 hover:text-zinc-400"
    }`}
  >
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
    Champions only
  </button>
  {championsOnly && (
    <span className="text-[10px] text-zinc-600">{vgcData.length} Reg M-A picks</span>
  )}
</div>
```

- [ ] **Step 4: Verify**

Run: `pnpm typecheck`
Expected: 0 errors.

Manual test: open the picker — the list should immediately show Champions pokemon. Toggle it off — search expands to all Pokemon.

- [ ] **Step 5: Commit**

```bash
git add src/app/calculator/_components/PokemonPickerModal.tsx
git commit -m "feat(ui): Champions-only filter toggle (default ON) in pokemon picker"
```

---

### Task 13: Fix Fake Out / Stale Cache Bug

**Files:**

- Modify: `src/server/api/routers/pokemon.ts`

**Root cause:** The `search` procedure checks the DB cache first. If a Pokemon is in the cache with stale `moveNames` (e.g., Sneasler was cached before its full move list — including Fake Out from Legends: Arceus — was written), the stale data is returned forever. The procedure also never writes PokeAPI results back to the DB, so manually fetching fresh data has no lasting effect.

The two-part fix: (1) update `search` to upsert fresh data to DB whenever it fetches from PokeAPI, and (2) add a `refresh` mutation that forces a re-fetch + cache update for a named Pokemon. Then delete Sneasler's stale row so the next search caches fresh data.

- [ ] **Step 1: Confirm the bug**

Run Prisma Studio (`pnpm db:studio`) and open `CachedPokemon`. Find the row where `name = "sneasler"`. Check `moveNames` — confirm `fake-out` is absent.

Also verify PokeAPI has it: open `https://pokeapi.co/api/v2/pokemon/sneasler` and search for `"fake-out"` in the `moves` array. It should appear under the `legends-arceus` version group.

- [ ] **Step 2: Update `search` to write fresh data back to DB cache**

Replace the `search` procedure in `src/server/api/routers/pokemon.ts` (lines 56–70):

```typescript
search: publicProcedure
  .input(z.object({ query: z.string().min(1).max(100) }))
  .query(async ({ input, ctx }) => {
    const q = input.query.toLowerCase().trim();
    const cached = await ctx.db.cachedPokemon.findFirst({ where: { name: q } });
    if (cached) return dbToSummary(cached);
    try {
      const pokemon = await fetchPokemon(q);
      await ctx.db.cachedPokemon.upsert({
        where: { name: pokemon.name },
        create: {
          id:        pokemon.pokeApiId,
          name:      pokemon.name,
          sprite:    pokemon.sprite,
          types:     pokemon.types,
          hp:        pokemon.baseStats.hp,
          attack:    pokemon.baseStats.attack,
          defense:   pokemon.baseStats.defense,
          spAttack:  pokemon.baseStats.spAttack,
          spDefense: pokemon.baseStats.spDefense,
          speed:     pokemon.baseStats.speed,
          moveNames: pokemon.moveNames,
        },
        update: {
          sprite:    pokemon.sprite,
          types:     pokemon.types,
          hp:        pokemon.baseStats.hp,
          attack:    pokemon.baseStats.attack,
          defense:   pokemon.baseStats.defense,
          spAttack:  pokemon.baseStats.spAttack,
          spDefense: pokemon.baseStats.spDefense,
          speed:     pokemon.baseStats.speed,
          moveNames: pokemon.moveNames,
        },
      });
      return pokemon;
    } catch {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: `Pokemon "${input.query}" not found.`,
      });
    }
  }),
```

- [ ] **Step 3: Add a `refresh` mutation for forced cache updates**

After the `getVgcTopPicks` procedure (end of file), add:

```typescript
  refresh: publicProcedure
    .input(z.object({ name: z.string().min(1).max(100) }))
    .mutation(async ({ input, ctx }) => {
      const name = input.name.toLowerCase().trim();
      try {
        const pokemon = await fetchPokemon(name);
        await ctx.db.cachedPokemon.upsert({
          where: { name: pokemon.name },
          create: {
            id:        pokemon.pokeApiId,
            name:      pokemon.name,
            sprite:    pokemon.sprite,
            types:     pokemon.types,
            hp:        pokemon.baseStats.hp,
            attack:    pokemon.baseStats.attack,
            defense:   pokemon.baseStats.defense,
            spAttack:  pokemon.baseStats.spAttack,
            spDefense: pokemon.baseStats.spDefense,
            speed:     pokemon.baseStats.speed,
            moveNames: pokemon.moveNames,
          },
          update: {
            sprite:    pokemon.sprite,
            types:     pokemon.types,
            hp:        pokemon.baseStats.hp,
            attack:    pokemon.baseStats.attack,
            defense:   pokemon.baseStats.defense,
            spAttack:  pokemon.baseStats.spAttack,
            spDefense: pokemon.baseStats.spDefense,
            speed:     pokemon.baseStats.speed,
            moveNames: pokemon.moveNames,
          },
        });
        return pokemon;
      } catch {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Pokemon "${input.name}" not found.`,
        });
      }
    }),
```

- [ ] **Step 4: Delete Sneasler's stale cache entry**

In Prisma Studio (`pnpm db:studio`), open `CachedPokemon`, find the row where `name = "sneasler"`, and delete it.

The next search for Sneasler will re-fetch from PokeAPI (which includes Fake Out) and write the fresh entry back to DB cache via the updated `search` procedure.

- [ ] **Step 5: Verify**

Run: `pnpm typecheck`
Expected: 0 errors.

Manual test: search for Sneasler in the calculator picker, select it, then type "Fake Out" in the move search — it should appear.

- [ ] **Step 6: Commit**

```bash
git add src/server/api/routers/pokemon.ts
git commit -m "fix(api): write PokeAPI results to DB cache in search, add refresh mutation — fixes stale Sneasler move list"
```

---

## Self-Review

**Spec coverage:**

| Requirement | Task covering it |
|---|---|
| TypeBadge anti-aliasing + ring + shadow | Task 1 |
| Items — search field | Task 5 (ItemSearch component) |
| Items — icon next to pokemon sprite | Task 10 Step 3 (PokemonSlotCard `item` prop) |
| Items — damage calc integration | Tasks 3 + 4 + 10 Steps 5,11 |
| Natures — selection below pokemon | Task 6 (NatureSelect) + Task 10 Step 9 |
| Natures — damage calc integration | Task 2 + Task 10 Step 5 |
| Tab: attacker → item → nature | Tasks 5,6 (containerRef props) + Task 10 Steps 6,7,9 |
| Tab: → defender → item → nature | Same, defender side |
| Tab: → move | Already in chain (Task 10 Step 6) |
| Tab: → attacker EVs → defender EVs | Task 10 Steps 2,10 (EvPanel containerRef) |
| Tab: → attacker stages → defender stages | Task 9 + Task 10 Step 10 |
| Tab: → weather (arrow key cycling) | Task 8 (PillGrid keyboard) |
| Tab: → terrain (same) | Task 8 |
| Tab: → level | Already in chain |
| Tab: → crit → burn | Task 8 (buttonRef props) + Task 10 Steps 6,11 |
| Nature preview in EV panel | Task 10 Steps 2,8 (`natureMults` prop) |
| Item modifier pill in result card | Task 7 |
| Champions-only filter in picker (default ON) | Task 12 |
| Fake Out / stale cache fix + write-back | Task 13 |

**Type consistency check:**

- `calcEffectiveStat(base, ev, level, natureMult?)` — used correctly in Task 10 Step 5 with `getNatureMult(...)` as 4th arg ✓
- `CompetitiveItem` imported from `~/lib/items` in both `ItemSearch.tsx` and `DamageCalculator.tsx` ✓
- `NatureKey` imported from `~/lib/natures` in both `NatureSelect.tsx` and `DamageCalculator.tsx` ✓
- `containerRef?: React.RefObject<HTMLDivElement | null>` — `EvPanel` and `StatStagePanel` both use this type ✓
- `containerRef?: React.RefObject<HTMLInputElement | null>` — `ItemSearch` ✓
- `containerRef?: React.RefObject<HTMLSelectElement | null>` — `NatureSelect` ✓
- `buttonRef?: React.RefObject<HTMLButtonElement | null>` — `ToggleButton` ✓
- `weatherRef`, `terrainRef` in `BattleConfigPanel` are `React.RefObject<HTMLDivElement | null>` — match `PillGrid` which renders a `<div>` ✓
- `attackerDamageMult` flows: `getItemDamageMult` returns `number` → `DamageInput.attackerDamageMult?: number` → `calculateDamage` reads it → `DamageResult.itemMult?: number` → `DamageResultCard` renders it ✓
- `championsSet` is `Set<string>` built from `vgcData.map(p => p.name)` — `allSummaries[].name` is also `string`, so `.has()` comparison is valid ✓
- Task 13 `upsert` `where: { name: pokemon.name }` — `CachedPokemon` schema has `name String @unique` ✓

---

## Ticket Plan

**Feature:** Items, Natures, TypeBadge Polish, Tab Chain, Champions Filter, Cache Fix
**Status:** READY FOR IMPLEMENTATION

| ID    | Title                                   | Type | Assignee      | Priority | Points | Depends On          |
|-------|-----------------------------------------|------|---------------|----------|--------|---------------------|
| DX-01 | TypeBadge anti-aliasing + ring + shadow | task | Junior Dev A  | P3       | 1      | —                   |
| DX-02 | Nature data (`natures.ts`)              | task | Junior Dev B  | P1       | 2      | —                   |
| DX-03 | `damage.ts` — nature + item mult        | task | Junior Dev B  | P0       | 2      | DX-02               |
| DX-04 | Item data (`items.ts`)                  | task | Junior Dev B  | P1       | 3      | —                   |
| DX-05 | `ItemSearch` component                  | task | Junior Dev A  | P1       | 3      | DX-04               |
| DX-06 | `NatureSelect` component                | task | Junior Dev A  | P1       | 2      | DX-02               |
| DX-07 | Item modifier pill in `DamageResult`    | task | Junior Dev A  | P2       | 1      | DX-03, DX-04        |
| DX-08 | `BattleConfigPanel` keyboard refs       | task | Junior Dev A  | P1       | 3      | —                   |
| DX-09 | `StatStagePanel` containerRef           | task | Junior Dev A  | P1       | 1      | —                   |
| DX-10 | `DamageCalculator` full wiring          | task | Senior Dev    | P0       | 8      | DX-03–DX-09         |
| DX-11 | `HotkeyModal` — 16-entry Tab copy       | task | Junior Dev A  | P3       | 1      | DX-10               |
| DX-12 | Champions-only filter toggle (picker)   | task | Junior Dev A  | P2       | 2      | —                   |
| DX-13 | Fix stale cache / Fake Out bug          | bug  | Junior Dev B  | P0       | 3      | —                   |
