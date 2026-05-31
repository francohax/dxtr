# Team Builder Enhancement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify the team builder and saved teams pages, add fuzzy Pokemon/move search, enable per-slot nature/EV/IV configuration, apply a purple gradient layout, and implement auto-advancing focus UX.

**Architecture:** All state stays in `TeamBuilder` — the unified `/teams` page prefetches both `team.list` and `pokemon.listNames` for instant hydration. Nature/EV/IV is stored as flat columns on `TeamSlot` to avoid extra tables. The fuzzy search uses a server-cached full name list filtered client-side; no external fuzzy library needed.

**Tech Stack:** Next.js 15 App Router · tRPC v11 · Prisma 6 · React 19 · Tailwind CSS v4 · Vitest 4

---

## File Map

| Status | Path | Responsibility |
|--------|------|----------------|
| Modify | `src/styles/globals.css` | Add purple gradient token |
| Modify | `src/app/layout.tsx` | Centered max-width layout + gradient bg |
| Modify | `src/lib/types.ts` | Add `StatSet`, extend `TeamSlotConfig` |
| Create | `src/lib/natures.ts` | 25 natures lookup, `calcStat` helper |
| Create | `src/lib/__tests__/natures.test.ts` | Unit tests for natures |
| Modify | `prisma/schema.prisma` | Add nature/EV/IV columns to `TeamSlot` |
| Modify | `src/server/api/routers/team.ts` | Persist new fields + `loadForBuilder` |
| Modify | `src/lib/pokeapi.ts` | `fetchAllPokemonNames`, `fetchAllMoveNames` |
| Modify | `src/server/api/routers/pokemon.ts` | `listNames`, `listMoveNames` procedures |
| Replace | `src/app/teams/_components/PokemonSearch.tsx` | Fuzzy combobox via `listNames` |
| Modify | `src/app/teams/_components/MoveSelector.tsx` | `autoFocus` on filter input |
| Create | `src/app/teams/_components/NatureSelector.tsx` | Nature `<select>` dropdown |
| Create | `src/app/teams/_components/StatEditor.tsx` | EV (0-252) + IV (0-31, toggled) inputs |
| Modify | `src/app/teams/_components/TeamSlot.tsx` | Show nature on filled slot; `isActive` highlight |
| Replace | `src/app/teams/_components/TeamBuilder.tsx` | Full rewrite with all new features |
| Create | `src/app/teams/_components/SavedTeamsPanel.tsx` | Saved teams list with Load/Delete |
| Modify | `src/app/teams/page.tsx` | Async server component, prefetch both queries |
| Replace | `src/app/my-teams/page.tsx` | Redirect to `/teams` |
| Modify | `src/app/_components/Nav.tsx` | Remove "My Teams" link |

---

## Task 1 — DX-16: Layout gradient + center-align

**Files:**
- Modify: `src/styles/globals.css`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Add gradient to globals.css**

Replace the `@layer base` block in `src/styles/globals.css`:

```css
@layer base {
  body {
    @apply bg-zinc-950 text-zinc-100 antialiased;
    background-image: radial-gradient(
      ellipse 80% 60% at 50% -10%,
      rgb(109 40 217 / 0.18) 0%,
      transparent 70%
    );
    background-attachment: fixed;
  }
}
```

- [ ] **Step 2: Tighten layout centering in layout.tsx**

In `src/app/layout.tsx`, update the `<main>` tag:

```tsx
<main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">{children}</main>
```

*(Was `max-w-6xl`. The tighter width keeps the team grid denser and more readable.)*

- [ ] **Step 3: Commit**

```bash
git add src/styles/globals.css src/app/layout.tsx
git commit -m "feat(ui): purple radial gradient bg + narrowed content width"
```

---

## Task 2 — DX-17: Extend types with nature/EV/IV

**Files:**
- Modify: `src/lib/types.ts`

- [ ] **Step 1: Add `StatSet` and update `TeamSlotConfig`**

Replace `src/lib/types.ts` entirely:

```typescript
export type PokemonType =
  | "normal" | "fire" | "water" | "electric" | "grass" | "ice"
  | "fighting" | "poison" | "ground" | "flying" | "psychic" | "bug"
  | "rock" | "ghost" | "dragon" | "dark" | "steel" | "fairy";

export type MoveCategory = "physical" | "special" | "status";

export interface PokemonSummary {
  pokeApiId: number;
  name: string;
  sprite: string;
  types: PokemonType[];
  baseStats: {
    hp: number;
    attack: number;
    defense: number;
    spAttack: number;
    spDefense: number;
    speed: number;
  };
  moveNames: string[];
}

export interface MoveDetail {
  pokeApiId: number;
  name: string;
  type: PokemonType;
  category: MoveCategory;
  power: number | null;
  accuracy: number | null;
  pp: number;
}

export interface StatSet {
  hp: number;
  attack: number;
  defense: number;
  spAttack: number;
  spDefense: number;
  speed: number;
}

export const ZERO_STATS: StatSet = {
  hp: 0, attack: 0, defense: 0, spAttack: 0, spDefense: 0, speed: 0,
};

export interface TeamSlotConfig {
  position: number;       // 0–5
  pokemon: PokemonSummary;
  moves: MoveDetail[];    // max 4
  nature: string;         // "adamant", "timid", etc. Default: "hardy"
  evs: StatSet;           // each 0–252, total ≤ 510
  ivs: StatSet;           // each 0–31
  ivsEnabled: boolean;    // false = treat all IVs as 0 in calculations
}

export interface TeamConfig {
  id?: number;
  name: string;
  slots: TeamSlotConfig[];
}
```

- [ ] **Step 2: Run typecheck — expect errors in TeamBuilder (uses old TeamSlotConfig shape)**

```powershell
$env:PATH = $env:PATH + ";C:\Users\Franco\AppData\Roaming\npm"
pnpm typecheck
```

Expected: errors about missing `nature`, `evs`, `ivs`, `ivsEnabled` in `TeamBuilder.tsx`. These will be fixed in Task 9.

- [ ] **Step 3: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat(types): add StatSet + extend TeamSlotConfig with nature/EV/IV"
```

---

## Task 3 — DX-18: Natures library + stat calculator

**Files:**
- Create: `src/lib/natures.ts`
- Create: `src/lib/__tests__/natures.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/__tests__/natures.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { getNatureMultiplier, calcStat } from "~/lib/natures";

describe("getNatureMultiplier", () => {
  it("returns 1.1 for the boosted stat", () => {
    expect(getNatureMultiplier("adamant", "attack")).toBe(1.1);
  });
  it("returns 0.9 for the reduced stat", () => {
    expect(getNatureMultiplier("adamant", "spAttack")).toBe(0.9);
  });
  it("returns 1.0 for an unaffected stat", () => {
    expect(getNatureMultiplier("adamant", "defense")).toBe(1.0);
  });
  it("returns 1.0 for a neutral nature", () => {
    expect(getNatureMultiplier("hardy", "attack")).toBe(1.0);
  });
});

describe("calcStat", () => {
  // Pikachu HP: base=35, iv=31, ev=0, level=50, hardy
  // HP = floor((2*35+31+0)*50/100) + 50 + 10 = floor(50.5) + 60 = 110
  it("calculates HP correctly", () => {
    expect(calcStat({ base: 35, iv: 31, ev: 0, level: 50, nature: "hardy", stat: "hp" })).toBe(110);
  });

  // Garchomp Atk: base=130, iv=31, ev=252, level=50, jolly (+spd -spAtk, neutral on atk)
  // base2 = 260+31+63=354; raw = floor(354*0.5)+5 = 177+5 = 182; ×1.0 = 182
  it("calculates non-HP stat correctly (neutral nature)", () => {
    expect(calcStat({ base: 130, iv: 31, ev: 252, level: 50, nature: "jolly", stat: "attack" })).toBe(182);
  });

  // Adamant: +atk; floor(182*1.1) = floor(200.2) = 200
  it("applies nature boost", () => {
    expect(calcStat({ base: 130, iv: 31, ev: 252, level: 50, nature: "adamant", stat: "attack" })).toBe(200);
  });

  // IV=0 EV=0: base2=260; raw=130+5=135; ×1.0=135
  it("handles zero IV and zero EV", () => {
    expect(calcStat({ base: 130, iv: 0, ev: 0, level: 50, nature: "hardy", stat: "attack" })).toBe(135);
  });
});
```

- [ ] **Step 2: Run tests — expect failure (module not found)**

```powershell
pnpm vitest run
```

Expected: `Cannot find module '~/lib/natures'`

- [ ] **Step 3: Create natures.ts**

Create `src/lib/natures.ts`:

```typescript
export type StatKey = "hp" | "attack" | "defense" | "spAttack" | "spDefense" | "speed";

export const NATURES: Record<string, { boost: StatKey | null; reduce: StatKey | null }> = {
  hardy:   { boost: null,          reduce: null },
  lonely:  { boost: "attack",      reduce: "defense" },
  brave:   { boost: "attack",      reduce: "speed" },
  adamant: { boost: "attack",      reduce: "spAttack" },
  naughty: { boost: "attack",      reduce: "spDefense" },
  bold:    { boost: "defense",     reduce: "attack" },
  docile:  { boost: null,          reduce: null },
  relaxed: { boost: "defense",     reduce: "speed" },
  impish:  { boost: "defense",     reduce: "spAttack" },
  lax:     { boost: "defense",     reduce: "spDefense" },
  timid:   { boost: "speed",       reduce: "attack" },
  hasty:   { boost: "speed",       reduce: "defense" },
  serious: { boost: null,          reduce: null },
  jolly:   { boost: "speed",       reduce: "spAttack" },
  naive:   { boost: "speed",       reduce: "spDefense" },
  modest:  { boost: "spAttack",    reduce: "attack" },
  mild:    { boost: "spAttack",    reduce: "defense" },
  quiet:   { boost: "spAttack",    reduce: "speed" },
  bashful: { boost: null,          reduce: null },
  rash:    { boost: "spAttack",    reduce: "spDefense" },
  calm:    { boost: "spDefense",   reduce: "attack" },
  gentle:  { boost: "spDefense",   reduce: "defense" },
  sassy:   { boost: "spDefense",   reduce: "speed" },
  careful: { boost: "spDefense",   reduce: "spAttack" },
  quirky:  { boost: null,          reduce: null },
};

export const NATURE_NAMES = Object.keys(NATURES) as string[];

export function getNatureMultiplier(nature: string, stat: StatKey): number {
  const n = NATURES[nature];
  if (!n) return 1.0;
  if (n.boost === stat) return 1.1;
  if (n.reduce === stat) return 0.9;
  return 1.0;
}

/**
 * Gen 6+ stat formula at any level.
 * HP uses a different formula than other stats.
 */
export function calcStat(opts: {
  base: number;
  iv: number;
  ev: number;
  level: number;
  nature: string;
  stat: StatKey;
}): number {
  const { base, iv, ev, level, nature, stat } = opts;
  const core = 2 * base + iv + Math.floor(ev / 4);
  if (stat === "hp") {
    return Math.floor((core * level) / 100) + level + 10;
  }
  const raw = Math.floor((core * level) / 100) + 5;
  return Math.floor(raw * getNatureMultiplier(nature, stat));
}
```

- [ ] **Step 4: Run tests — all must pass**

```powershell
pnpm vitest run
```

Expected output:
```
✓ src/lib/__tests__/natures.test.ts (8 tests)
✓ src/lib/__tests__/damage.test.ts (9 tests)

Test Files  2 passed (2)
Tests       17 passed (17)
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/natures.ts src/lib/__tests__/natures.test.ts
git commit -m "feat(lib): natures lookup + gen6 stat calculator with tests"
```

---

## Task 4 — DX-19: Schema — nature/EV/IV columns

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add columns to TeamSlot**

Replace the `model TeamSlot` block in `prisma/schema.prisma`:

```prisma
model TeamSlot {
    id         Int            @id @default(autoincrement())
    position   Int
    teamId     Int
    pokeApiId  Int
    name       String
    sprite     String
    types      String[]

    nature     String         @default("hardy")
    evHp       Int            @default(0)
    evAtk      Int            @default(0)
    evDef      Int            @default(0)
    evSpAtk    Int            @default(0)
    evSpDef    Int            @default(0)
    evSpeed    Int            @default(0)
    ivHp       Int            @default(0)
    ivAtk      Int            @default(0)
    ivDef      Int            @default(0)
    ivSpAtk    Int            @default(0)
    ivSpDef    Int            @default(0)
    ivSpeed    Int            @default(0)
    ivsEnabled Boolean        @default(false)

    team       Team           @relation(fields: [teamId], references: [id], onDelete: Cascade)
    moves      TeamSlotMove[]

    @@unique([teamId, position])
}
```

- [ ] **Step 2: Push schema to database**

```powershell
$env:PATH = $env:PATH + ";C:\Users\Franco\AppData\Roaming\npm"
pnpm db:push
```

Expected: `Your database is now in sync with your schema.`

- [ ] **Step 3: Regenerate Prisma client**

```powershell
pnpm exec prisma generate
```

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(schema): add nature/EV/IV columns to TeamSlot"
```

---

## Task 5 — DX-20: tRPC team — persist new fields + loadForBuilder

**Files:**
- Modify: `src/server/api/routers/team.ts`

- [ ] **Step 1: Replace team.ts**

```typescript
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { fetchPokemon } from "~/lib/pokeapi";
import { type MoveCategory, type PokemonType, type TeamSlotConfig } from "~/lib/types";

const MoveInput = z.object({
  position: z.number().min(0).max(3),
  pokeApiId: z.number(),
  name: z.string(),
  type: z.string(),
  category: z.string(),
  power: z.number().nullable(),
  accuracy: z.number().nullable(),
  pp: z.number(),
});

const SlotInput = z.object({
  position: z.number().min(0).max(5),
  pokeApiId: z.number(),
  name: z.string(),
  sprite: z.string(),
  types: z.array(z.string()),
  nature: z.string().default("hardy"),
  evHp: z.number().min(0).max(252).default(0),
  evAtk: z.number().min(0).max(252).default(0),
  evDef: z.number().min(0).max(252).default(0),
  evSpAtk: z.number().min(0).max(252).default(0),
  evSpDef: z.number().min(0).max(252).default(0),
  evSpeed: z.number().min(0).max(252).default(0),
  ivHp: z.number().min(0).max(31).default(0),
  ivAtk: z.number().min(0).max(31).default(0),
  ivDef: z.number().min(0).max(31).default(0),
  ivSpAtk: z.number().min(0).max(31).default(0),
  ivSpDef: z.number().min(0).max(31).default(0),
  ivSpeed: z.number().min(0).max(31).default(0),
  ivsEnabled: z.boolean().default(false),
  moves: z.array(MoveInput),
});

export const teamRouter = createTRPCRouter({
  create: publicProcedure
    .input(z.object({ name: z.string().min(1).max(60), slots: z.array(SlotInput).min(1).max(6) }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.team.create({
        data: {
          name: input.name,
          slots: {
            create: input.slots.map(slot => ({
              position: slot.position,
              pokeApiId: slot.pokeApiId,
              name: slot.name,
              sprite: slot.sprite,
              types: slot.types,
              nature: slot.nature,
              evHp: slot.evHp,
              evAtk: slot.evAtk,
              evDef: slot.evDef,
              evSpAtk: slot.evSpAtk,
              evSpDef: slot.evSpDef,
              evSpeed: slot.evSpeed,
              ivHp: slot.ivHp,
              ivAtk: slot.ivAtk,
              ivDef: slot.ivDef,
              ivSpAtk: slot.ivSpAtk,
              ivSpDef: slot.ivSpDef,
              ivSpeed: slot.ivSpeed,
              ivsEnabled: slot.ivsEnabled,
              moves: {
                create: slot.moves.map(move => ({
                  position: move.position,
                  pokeApiId: move.pokeApiId,
                  name: move.name,
                  type: move.type,
                  category: move.category,
                  power: move.power,
                  accuracy: move.accuracy,
                  pp: move.pp,
                })),
              },
            })),
          },
        },
        include: { slots: { include: { moves: true } } },
      });
    }),

  list: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.team.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        slots: {
          include: { moves: true },
          orderBy: { position: "asc" },
        },
      },
    });
  }),

  get: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.team.findUnique({
        where: { id: input.id },
        include: {
          slots: {
            include: { moves: { orderBy: { position: "asc" } } },
            orderBy: { position: "asc" },
          },
        },
      });
    }),

  loadForBuilder: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const team = await ctx.db.team.findUnique({
        where: { id: input.id },
        include: {
          slots: {
            include: { moves: { orderBy: { position: "asc" } } },
            orderBy: { position: "asc" },
          },
        },
      });
      if (!team) throw new TRPCError({ code: "NOT_FOUND", message: "Team not found" });

      const slots = await Promise.all(
        team.slots.map(async (slot): Promise<TeamSlotConfig> => {
          const pokemon = await fetchPokemon(slot.pokeApiId);
          return {
            position: slot.position,
            pokemon,
            moves: slot.moves.map(m => ({
              pokeApiId: m.pokeApiId,
              name: m.name,
              type: m.type as PokemonType,
              category: m.category as MoveCategory,
              power: m.power,
              accuracy: m.accuracy,
              pp: m.pp,
            })),
            nature: slot.nature,
            evs: {
              hp: slot.evHp,
              attack: slot.evAtk,
              defense: slot.evDef,
              spAttack: slot.evSpAtk,
              spDefense: slot.evSpDef,
              speed: slot.evSpeed,
            },
            ivs: {
              hp: slot.ivHp,
              attack: slot.ivAtk,
              defense: slot.ivDef,
              spAttack: slot.ivSpAtk,
              spDefense: slot.ivSpDef,
              speed: slot.ivSpeed,
            },
            ivsEnabled: slot.ivsEnabled,
          };
        })
      );
      return slots;
    }),

  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.team.delete({ where: { id: input.id } });
    }),
});
```

- [ ] **Step 2: Typecheck**

```powershell
pnpm typecheck
```

Expected: errors only in `TeamBuilder.tsx` (old `handleSave` shape). No router errors.

- [ ] **Step 3: Commit**

```bash
git add src/server/api/routers/team.ts
git commit -m "feat(api): persist nature/EV/IV + add team.loadForBuilder procedure"
```

---

## Task 6 — DX-21: tRPC pokemon — listNames + listMoveNames

**Files:**
- Modify: `src/lib/pokeapi.ts`
- Modify: `src/server/api/routers/pokemon.ts`

- [ ] **Step 1: Add fetch helpers to pokeapi.ts**

Append to the end of `src/lib/pokeapi.ts` (before the final blank line):

```typescript
export async function fetchAllPokemonNames(): Promise<string[]> {
  const res = await fetch(
    "https://pokeapi.co/api/v2/pokemon?limit=1302&offset=0",
    { next: { revalidate: 604800 } }
  );
  if (!res.ok) throw new Error(`PokeAPI ${res.status}: pokemon list`);
  const data = (await res.json()) as { results: { name: string }[] };
  return data.results.map(p => p.name);
}

export async function fetchAllMoveNames(): Promise<string[]> {
  const res = await fetch(
    "https://pokeapi.co/api/v2/move?limit=937&offset=0",
    { next: { revalidate: 604800 } }
  );
  if (!res.ok) throw new Error(`PokeAPI ${res.status}: move list`);
  const data = (await res.json()) as { results: { name: string }[] };
  return data.results.map(m => m.name);
}
```

- [ ] **Step 2: Add procedures to pokemon.ts**

Replace `src/server/api/routers/pokemon.ts`:

```typescript
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { fetchPokemon, fetchMove, fetchAllPokemonNames, fetchAllMoveNames } from "~/lib/pokeapi";

export const pokemonRouter = createTRPCRouter({
  search: publicProcedure
    .input(z.object({ query: z.string().min(1).max(100) }))
    .query(async ({ input }) => {
      try {
        return await fetchPokemon(input.query.toLowerCase().trim());
      } catch {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Pokemon "${input.query}" not found.`,
        });
      }
    }),

  getMove: publicProcedure
    .input(z.object({ moveName: z.string().min(1) }))
    .query(async ({ input }) => {
      try {
        return await fetchMove(input.moveName);
      } catch {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Move "${input.moveName}" not found.`,
        });
      }
    }),

  listNames: publicProcedure.query(async () => {
    return fetchAllPokemonNames();
  }),

  listMoveNames: publicProcedure.query(async () => {
    return fetchAllMoveNames();
  }),
});
```

- [ ] **Step 3: Typecheck**

```powershell
pnpm typecheck
```

Expected: clean (no new errors).

- [ ] **Step 4: Commit**

```bash
git add src/lib/pokeapi.ts src/server/api/routers/pokemon.ts
git commit -m "feat(api): add pokemon.listNames + pokemon.listMoveNames procedures"
```

---

## Task 7 — DX-22: PokemonSearch — fuzzy combobox

**Files:**
- Replace: `src/app/teams/_components/PokemonSearch.tsx`

- [ ] **Step 1: Replace PokemonSearch.tsx**

The new component loads the full name list once (staleTime: Infinity), filters client-side as the user types, shows a dropdown of up to 20 matches, and on selection fetches the full Pokemon data. The `autoFocus` prop wires to the input's native `autoFocus` attribute.

```typescript
"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { api } from "~/trpc/react";
import { TypeBadge } from "~/app/_components/TypeBadge";
import { StatBar } from "~/app/_components/StatBar";
import { type PokemonSummary } from "~/lib/types";

interface PokemonSearchProps {
  onSelect: (pokemon: PokemonSummary) => void;
  autoFocus?: boolean;
}

export function PokemonSearch({ onSelect, autoFocus }: PokemonSearchProps) {
  const [query, setQuery] = useState("");
  const [chosen, setChosen] = useState<string | null>(null);

  const { data: allNames = [] } = api.pokemon.listNames.useQuery(undefined, {
    staleTime: Infinity,
  });

  const { data: pokemon, isFetching, error } = api.pokemon.search.useQuery(
    { query: chosen ?? "" },
    { enabled: !!chosen, retry: false }
  );

  const matches = useMemo(() => {
    if (query.length < 2) return [];
    const q = query.toLowerCase().replace(/\s/g, "-");
    return allNames.filter(n => n.includes(q)).slice(0, 20);
  }, [query, allNames]);

  function pick(name: string) {
    setChosen(name);
    setQuery(name.replace(/-/g, " "));
  }

  function reset() {
    setChosen(null);
    setQuery("");
  }

  if (pokemon && chosen) {
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
          <div className="flex items-start gap-4">
            <Image
              src={pokemon.sprite}
              alt={pokemon.name}
              width={96}
              height={96}
              className="shrink-0 drop-shadow-lg"
              unoptimized
            />
            <div className="flex flex-1 flex-col gap-2">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold capitalize">{pokemon.name}</h3>
                <span className="text-sm text-zinc-500">#{String(pokemon.pokeApiId).padStart(3, "0")}</span>
              </div>
              <div className="flex gap-1">
                {pokemon.types.map(t => <TypeBadge key={t} type={t} size="sm" />)}
              </div>
              <div className="flex flex-col gap-1 pt-1">
                <StatBar label="HP"     value={pokemon.baseStats.hp} />
                <StatBar label="Atk"    value={pokemon.baseStats.attack} />
                <StatBar label="Def"    value={pokemon.baseStats.defense} />
                <StatBar label="Sp.Atk" value={pokemon.baseStats.spAttack} />
                <StatBar label="Sp.Def" value={pokemon.baseStats.spDefense} />
                <StatBar label="Speed"  value={pokemon.baseStats.speed} />
              </div>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => onSelect(pokemon)}
              className="flex-1 rounded-xl bg-violet-600 py-2 text-sm font-semibold text-white transition hover:bg-violet-500"
            >
              Add to Team
            </button>
            <button
              onClick={reset}
              className="rounded-xl border border-zinc-700 px-3 py-2 text-sm text-zinc-400 transition hover:text-white"
            >
              Clear
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col gap-2">
      <input
        autoFocus={autoFocus}
        value={query}
        onChange={e => { setQuery(e.target.value); setChosen(null); }}
        placeholder="Charizard, pikachu, 25…"
        className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
      />
      {isFetching && <p className="text-xs text-zinc-500">Loading…</p>}
      {error && <p className="text-sm text-red-400">{error.message}</p>}
      {matches.length > 0 && !chosen && (
        <ul className="absolute top-full z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-zinc-700 bg-zinc-900 py-1 shadow-2xl">
          {matches.map(name => (
            <li key={name}>
              <button
                onClick={() => pick(name)}
                className="w-full px-4 py-1.5 text-left text-sm capitalize transition hover:bg-zinc-800"
              >
                {name.replace(/-/g, " ")}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

```powershell
pnpm typecheck
```

Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/app/teams/_components/PokemonSearch.tsx
git commit -m "feat(ui): fuzzy pokemon combobox with dropdown from full name list"
```

---

## Task 8 — DX-23: MoveSelector — auto-focus filter input

**Files:**
- Modify: `src/app/teams/_components/MoveSelector.tsx`

The filter input needs an `autoFocus` prop so it captures keyboard input the moment the move editor panel opens, and the search results need to highlight selected moves more clearly. Only the input prop changes.

- [ ] **Step 1: Add `autoFocus` to filter input**

In `src/app/teams/_components/MoveSelector.tsx`, change line 26 (`<input type="text"`) to:

```tsx
      <input
        type="text"
        autoFocus
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Filter moves…"
        className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
      />
```

- [ ] **Step 2: Typecheck + commit**

```powershell
pnpm typecheck
```

```bash
git add src/app/teams/_components/MoveSelector.tsx
git commit -m "feat(ui): auto-focus move filter input when panel opens"
```

---

## Task 9 — DX-24: NatureSelector + StatEditor + full TeamBuilder rewrite

**Files:**
- Create: `src/app/teams/_components/NatureSelector.tsx`
- Create: `src/app/teams/_components/StatEditor.tsx`
- Modify: `src/app/teams/_components/TeamSlot.tsx`
- Replace: `src/app/teams/_components/TeamBuilder.tsx`

This is the largest task. It wires nature/EV/IV editing into the slot configure panel and fixes the TypeScript errors introduced in Task 2 by providing the new `TeamSlotConfig` shape everywhere.

- [ ] **Step 1: Create NatureSelector.tsx**

```typescript
"use client";

import { NATURE_NAMES, NATURES } from "~/lib/natures";
import type { StatKey } from "~/lib/natures";

const STAT_ABBR: Record<StatKey, string> = {
  hp: "HP", attack: "Atk", defense: "Def",
  spAttack: "SpA", spDefense: "SpD", speed: "Spe",
};

interface NatureSelectorProps {
  value: string;
  onChange: (nature: string) => void;
}

export function NatureSelector({ value, onChange }: NatureSelectorProps) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-zinc-400">Nature</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm capitalize text-white outline-none focus:border-violet-500"
      >
        {NATURE_NAMES.map(name => {
          const n = NATURES[name]!;
          const label = n.boost
            ? `${name} (+${STAT_ABBR[n.boost]} −${STAT_ABBR[n.reduce!]})`
            : `${name} (neutral)`;
          return (
            <option key={name} value={name}>{label}</option>
          );
        })}
      </select>
    </div>
  );
}
```

- [ ] **Step 2: Create StatEditor.tsx**

```typescript
"use client";

import type { StatSet } from "~/lib/types";

const STAT_KEYS: (keyof StatSet)[] = ["hp", "attack", "defense", "spAttack", "spDefense", "speed"];
const STAT_LABELS: Record<keyof StatSet, string> = {
  hp: "HP", attack: "Atk", defense: "Def",
  spAttack: "SpA", spDefense: "SpD", speed: "Spe",
};

interface StatEditorProps {
  evs: StatSet;
  ivs: StatSet;
  ivsEnabled: boolean;
  onEvsChange: (evs: StatSet) => void;
  onIvsChange: (ivs: StatSet) => void;
  onIvsToggle: (enabled: boolean) => void;
}

export function StatEditor({ evs, ivs, ivsEnabled, onEvsChange, onIvsChange, onIvsToggle }: StatEditorProps) {
  const totalEvs = Object.values(evs).reduce((a, b) => a + b, 0);

  function setEv(stat: keyof StatSet, raw: string) {
    const val = Math.min(252, Math.max(0, parseInt(raw) || 0));
    const otherTotal = (Object.entries(evs) as [keyof StatSet, number][])
      .filter(([k]) => k !== stat)
      .reduce((sum, [, v]) => sum + v, 0);
    onEvsChange({ ...evs, [stat]: Math.min(val, 510 - otherTotal) });
  }

  function setIv(stat: keyof StatSet, raw: string) {
    onIvsChange({ ...ivs, [stat]: Math.min(31, Math.max(0, parseInt(raw) || 0)) });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-zinc-400">
          EVs <span className="text-zinc-600">({totalEvs}/510)</span>
        </span>
        <label className="flex cursor-pointer items-center gap-1.5 text-xs text-zinc-400">
          <input
            type="checkbox"
            checked={ivsEnabled}
            onChange={e => onIvsToggle(e.target.checked)}
            className="accent-violet-500"
          />
          Show IVs
        </label>
      </div>
      {ivsEnabled && (
        <div className={`grid gap-2 text-xs text-zinc-500 ${ivsEnabled ? "grid-cols-[3rem_1fr_1fr]" : "grid-cols-[3rem_1fr]"}`}>
          <span />
          <span className="text-center">EV</span>
          <span className="text-center">IV</span>
        </div>
      )}
      <div className="grid gap-1.5">
        {STAT_KEYS.map(stat => (
          <div
            key={stat}
            className={`grid items-center gap-2 ${ivsEnabled ? "grid-cols-[3rem_1fr_1fr]" : "grid-cols-[3rem_1fr]"}`}
          >
            <span className="text-xs text-zinc-500">{STAT_LABELS[stat]}</span>
            <input
              type="number"
              min={0}
              max={252}
              value={evs[stat]}
              onChange={e => setEv(stat, e.target.value)}
              className="w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-0.5 text-xs text-white outline-none focus:border-violet-500 [appearance:textfield]"
            />
            {ivsEnabled && (
              <input
                type="number"
                min={0}
                max={31}
                value={ivs[stat]}
                onChange={e => setIv(stat, e.target.value)}
                className="w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-0.5 text-xs text-zinc-300 outline-none focus:border-violet-500 [appearance:textfield]"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Update TeamSlot.tsx — add `isActive` highlight + show nature**

Replace `src/app/teams/_components/TeamSlot.tsx`:

```typescript
"use client";

import Image from "next/image";
import { TypeBadge } from "~/app/_components/TypeBadge";
import { type PokemonSummary, type MoveDetail, type PokemonType } from "~/lib/types";

interface TeamSlotProps {
  position: number;
  pokemon: PokemonSummary | null;
  moves: MoveDetail[];
  nature: string;
  isActive: boolean;
  onRemove: () => void;
  onConfigure: () => void;
}

export function TeamSlot({ position, pokemon, moves, nature, isActive, onRemove, onConfigure }: TeamSlotProps) {
  if (!pokemon) {
    return (
      <div className={`flex h-36 flex-col items-center justify-center rounded-2xl border-2 border-dashed transition ${
        isActive
          ? "border-violet-500 bg-violet-950/20 text-violet-400"
          : "border-zinc-800 text-zinc-600 hover:border-zinc-700"
      }`}>
        <span className="text-2xl">+</span>
        <span className="text-xs">Slot {position + 1}</span>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col gap-2 rounded-2xl border border-zinc-800 bg-zinc-900 p-3 transition hover:border-zinc-700">
      <button
        onClick={onRemove}
        className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full text-zinc-600 transition hover:bg-zinc-700 hover:text-white"
        aria-label="Remove pokemon"
      >
        ×
      </button>
      <div className="flex items-center gap-3">
        <Image
          src={pokemon.sprite}
          alt={pokemon.name}
          width={56}
          height={56}
          className="shrink-0 drop-shadow"
          unoptimized
        />
        <div className="flex flex-col gap-1">
          <span className="text-sm font-bold capitalize">{pokemon.name}</span>
          <div className="flex flex-wrap gap-1">
            {pokemon.types.map(t => <TypeBadge key={t} type={t as PokemonType} size="sm" />)}
          </div>
          <span className="text-xs capitalize text-zinc-500">{nature}</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-1">
        {moves.length === 0 ? (
          <span className="text-xs text-zinc-600">No moves assigned</span>
        ) : (
          moves.map(m => (
            <span key={m.name} className="rounded-md bg-zinc-800 px-2 py-0.5 text-xs capitalize text-zinc-300">
              {m.name.replace(/-/g, " ")}
            </span>
          ))
        )}
      </div>
      <button
        onClick={onConfigure}
        className="mt-1 w-full rounded-lg bg-zinc-800 py-1 text-xs font-medium text-zinc-300 transition hover:bg-zinc-700"
      >
        Configure
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Replace TeamBuilder.tsx with full rewrite**

```typescript
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
```

- [ ] **Step 5: Typecheck**

```powershell
pnpm typecheck
```

Expected: errors about `SavedTeamsPanel` (not yet created). All other errors should be gone.

- [ ] **Step 6: Commit**

```bash
git add src/app/teams/_components/NatureSelector.tsx \
        src/app/teams/_components/StatEditor.tsx \
        src/app/teams/_components/TeamSlot.tsx \
        src/app/teams/_components/TeamBuilder.tsx
git commit -m "feat(ui): nature selector + EV/IV editor + full TeamBuilder rewrite"
```

---

## Task 10 — DX-25: Unified /teams page with saved teams panel + routing cleanup

**Files:**
- Create: `src/app/teams/_components/SavedTeamsPanel.tsx`
- Modify: `src/app/teams/page.tsx`
- Replace: `src/app/my-teams/page.tsx`
- Modify: `src/app/_components/Nav.tsx`

- [ ] **Step 1: Create SavedTeamsPanel.tsx**

```typescript
"use client";

import { useState } from "react";
import Image from "next/image";
import { api } from "~/trpc/react";
import { TypeBadge } from "~/app/_components/TypeBadge";
import { type PokemonType } from "~/lib/types";

interface SavedTeamsPanelProps {
  onLoad: (teamId: number) => Promise<void>;
}

export function SavedTeamsPanel({ onLoad }: SavedTeamsPanelProps) {
  const { data: teams = [] } = api.team.list.useQuery();
  const utils = api.useUtils();
  const deleteTeam = api.team.delete.useMutation({
    onSuccess: () => utils.team.list.invalidate(),
  });
  const [loadingId, setLoadingId] = useState<number | null>(null);

  if (teams.length === 0) return null;

  return (
    <div className="flex flex-col gap-4 border-t border-zinc-800 pt-8">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-bold">Saved Teams</h2>
        <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
          {teams.length}
        </span>
      </div>
      {teams.map(team => {
        const sorted = [...team.slots].sort((a, b) => a.position - b.position);
        return (
          <div
            key={team.id}
            className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 transition hover:border-zinc-700"
          >
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{team.name}</h3>
                <p className="text-xs text-zinc-500">
                  {team.slots.length} Pokémon · {new Date(team.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    setLoadingId(team.id);
                    await onLoad(team.id);
                    setLoadingId(null);
                  }}
                  disabled={loadingId === team.id}
                  className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-violet-500 disabled:opacity-50"
                >
                  {loadingId === team.id ? "Loading…" : "Load"}
                </button>
                <button
                  onClick={() => deleteTeam.mutate({ id: team.id })}
                  disabled={deleteTeam.isPending}
                  className="rounded-lg px-2 py-1.5 text-xs text-zinc-600 transition hover:bg-zinc-800 hover:text-red-400 disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            </div>
            <div className="grid grid-cols-6 gap-2">
              {Array.from({ length: 6 }).map((_, i) => {
                const slot = sorted[i];
                return slot ? (
                  <div key={slot.id} className="flex flex-col items-center gap-1">
                    <Image
                      src={slot.sprite}
                      alt={slot.name}
                      width={40}
                      height={40}
                      unoptimized
                      className="drop-shadow"
                    />
                    <div className="flex flex-wrap justify-center gap-0.5">
                      {slot.types.map(t => (
                        <TypeBadge key={t} type={t as PokemonType} size="sm" />
                      ))}
                    </div>
                  </div>
                ) : (
                  <div
                    key={i}
                    className="flex h-10 items-center justify-center rounded-lg border border-dashed border-zinc-800 text-xs text-zinc-700"
                  >
                    —
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Update teams/page.tsx to prefetch both queries**

```typescript
import { api, HydrateClient } from "~/trpc/server";
import { TeamBuilder } from "./_components/TeamBuilder";

export default async function TeamsPage() {
  void api.team.list.prefetch();
  void api.pokemon.listNames.prefetch();
  return (
    <HydrateClient>
      <div>
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Team Builder</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Build your team, configure moves and stats, then save or load from your collection below.
          </p>
        </div>
        <TeamBuilder />
      </div>
    </HydrateClient>
  );
}
```

- [ ] **Step 3: Redirect my-teams → teams**

Replace `src/app/my-teams/page.tsx`:

```typescript
import { redirect } from "next/navigation";

export default function MyTeamsPage() {
  redirect("/teams");
}
```

- [ ] **Step 4: Remove "My Teams" from Nav**

In `src/app/_components/Nav.tsx`, update the `links` array:

```typescript
const links = [
  { href: "/teams",      label: "Team Builder" },
  { href: "/calculator", label: "Damage Calc" },
];
```

- [ ] **Step 5: Typecheck + run tests**

```powershell
pnpm typecheck
pnpm vitest run
```

Expected: clean typecheck, 17 tests passing.

- [ ] **Step 6: Commit**

```bash
git add src/app/teams/_components/SavedTeamsPanel.tsx \
        src/app/teams/page.tsx \
        src/app/my-teams/page.tsx \
        src/app/_components/Nav.tsx
git commit -m "feat(ui): unified /teams page with saved teams panel + redirect /my-teams"
```

---

## Self-Review

**Spec coverage:**
| Requirement | Task |
|---|---|
| Combined team builder + my teams, hot-switch | Task 10 (SavedTeamsPanel) + Task 9 (handleLoadTeam) |
| Fuzzy search — dropdown list of matches | Task 7 (PokemonSearch) |
| Move search fuzzy filter | Task 8 (MoveSelector autoFocus — filter already works) |
| Nature editing per slot | Task 9 (NatureSelector) |
| EV editing per slot (0–252, sum ≤ 510) | Task 9 (StatEditor) |
| IV editing, toggled off by default | Task 9 (StatEditor ivsEnabled) |
| Nature/EV/IV persisted in DB | Tasks 4 + 5 |
| Purple gradient background | Task 1 |
| Center-aligned layout | Task 1 |
| Auto-focus on slot selection | Task 9 (searchKey remount) |
| Auto-advance to next empty slot | Task 9 (addPokemon next-empty logic) |
| All slots filled → focus Save button | Task 9 (saveButtonRef.focus) |
| /my-teams redirects to /teams | Task 10 |
| Nav removes My Teams link | Task 10 |

**Placeholder scan:** None found. Every step contains complete code.

**Type consistency check:**
- `ZERO_STATS` exported from `types.ts`, used in `TeamBuilder.tsx` ✓
- `StatSet` interface used in `StatEditor.tsx` + `TeamSlotConfig` + tRPC input ✓
- `StatKey` type defined in `natures.ts`, used internally ✓
- `TeamSlot` receives `nature: string` + `isActive: boolean` + `onConfigure` (renamed from `onEditMoves`) — `TeamBuilder` passes all three ✓
- `SavedTeamsPanel` receives `onLoad: (teamId: number) => Promise<void>` — `TeamBuilder` passes `handleLoadTeam` which is async ✓
- `loadForBuilder` returns `TeamSlotConfig[]` — matches what `handleLoadTeam` expects ✓
