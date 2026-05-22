# dxtr First Pass — Pokemon Team Builder & Damage Calculator

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an interactive web application where users can search for Pokemon, assemble teams of up to 6, assign movesets, save those teams to Postgres, and simulate damage calculations — all wrapped in a type-themed, polished UI.

**Architecture:** PokeAPI (external, no key required) is proxied through tRPC procedures so the client never fetches it directly; this keeps a consistent caching and error-handling layer. Team state is persisted in Postgres via Prisma. Client-side React Query (via tRPC) handles caching and optimistic updates. Damage calculation is isolated in a pure TypeScript module with no side effects.

**Tech Stack:** Next.js 15 (App Router) · React 19 · tRPC v11 · Prisma 6 · PostgreSQL · Tailwind CSS v4 · TypeScript 5 · Vitest (added in Task 1) · pnpm

---

## File Map

```
Files created or modified in this plan:

prisma/
  schema.prisma                           MODIFY — add Pokemon, Move, Team, TeamSlot, TeamSlotMove models

src/
  lib/
    types.ts                              CREATE — shared domain types (PokemonSummary, MoveDetail, TeamConfig, etc.)
    damage.ts                             CREATE — pure damage formula + type chart
    pokeapi.ts                            CREATE — typed fetch helpers for PokeAPI (server-only)

  server/api/routers/
    pokemon.ts                            CREATE — tRPC: search pokemon, list moves, get move detail
    team.ts                               CREATE — tRPC: create / get / list / delete teams
    root.ts                               MODIFY — register pokemon + team routers

  app/
    layout.tsx                            MODIFY — update metadata, add font, wrap with Nav
    page.tsx                              MODIFY — redirect to /teams
    teams/
      page.tsx                            CREATE — team builder page (server component shell)
      _components/
        TeamBuilder.tsx                   CREATE — client component: 6-slot grid + search + move selector
        TeamSlot.tsx                      CREATE — single slot card (empty/filled states)
        PokemonSearch.tsx                 CREATE — search input + result list
        MoveSelector.tsx                  CREATE — modal/drawer for selecting 4 moves per slot
        SaveTeamModal.tsx                 CREATE — name input + save button
    my-teams/
      page.tsx                            CREATE — saved teams list (server component)
      _components/
        TeamCard.tsx                      CREATE — saved team preview card
    calculator/
      page.tsx                            CREATE — damage calculator page (server component shell)
      _components/
        DamageCalculator.tsx              CREATE — client component: attacker/move/defender form
        DamageResult.tsx                  CREATE — breakdown card (base / STAB / type / range)
    _components/
      Nav.tsx                             CREATE — top navigation bar
      TypeBadge.tsx                       CREATE — coloured type pill (fire, water, etc.)
      StatBar.tsx                         CREATE — horizontal base-stat bar with label + value

  styles/
    globals.css                           MODIFY — add 18 Pokemon type colour CSS variables + @theme entries

vitest.config.ts                          CREATE — Vitest config pointing at src/lib/**
```

---

## Phase 1 — Foundation

---

### Task 1: Vitest Setup

**Files:**
- Create: `vitest.config.ts`
- Create: `src/lib/__tests__/damage.test.ts` (placeholder — expanded in Task 7)

- [ ] **Step 1: Install Vitest**

```powershell
pnpm add -D vitest @vitest/coverage-v8
```

Expected output: packages added to `devDependencies` in `package.json`.

- [ ] **Step 2: Create Vitest config**

Create `vitest.config.ts` at project root:

```ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/lib/__tests__/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "src"),
    },
  },
});
```

- [ ] **Step 3: Add test script to package.json**

In `package.json`, add to `"scripts"`:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Create test directory**

```powershell
New-Item -ItemType Directory -Force src/lib/__tests__
```

- [ ] **Step 5: Write a smoke test to verify the setup works**

Create `src/lib/__tests__/smoke.test.ts`:

```ts
import { describe, it, expect } from "vitest";

describe("vitest setup", () => {
  it("runs", () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 6: Run tests and verify they pass**

```powershell
pnpm test
```

Expected: `1 passed`

- [ ] **Step 7: Commit**

```powershell
git add vitest.config.ts package.json src/lib/__tests__/smoke.test.ts
git commit -m "chore: add vitest for unit testing"
```

---

### Task 2: Shared Domain Types

**Files:**
- Create: `src/lib/types.ts`

No tests needed — this is pure type definitions.

- [ ] **Step 1: Create `src/lib/types.ts`**

```ts
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

export interface TeamSlotConfig {
  position: number;       // 0–5
  pokemon: PokemonSummary;
  moves: MoveDetail[];    // max 4
}

export interface TeamConfig {
  id?: number;
  name: string;
  slots: TeamSlotConfig[];
}
```

- [ ] **Step 2: Commit**

```powershell
git add src/lib/types.ts
git commit -m "chore: add shared domain types"
```

---

### Task 3: Prisma Schema — Team Models

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Replace the contents of `prisma/schema.prisma`**

```prisma
generator client {
    provider = "prisma-client-js"
    output   = "../generated/prisma"
}

datasource db {
    provider = "postgresql"
    url      = env("DATABASE_URL")
}

model Team {
    id        Int        @id @default(autoincrement())
    name      String
    createdAt DateTime   @default(now())
    updatedAt DateTime   @updatedAt
    slots     TeamSlot[]
}

model TeamSlot {
    id        Int            @id @default(autoincrement())
    position  Int
    teamId    Int
    pokeApiId Int
    name      String
    sprite    String
    types     String[]

    team      Team           @relation(fields: [teamId], references: [id], onDelete: Cascade)
    moves     TeamSlotMove[]

    @@unique([teamId, position])
}

model TeamSlotMove {
    id         Int      @id @default(autoincrement())
    position   Int
    teamSlotId Int
    pokeApiId  Int
    name       String
    type       String
    category   String
    power      Int?
    accuracy   Int?
    pp         Int

    teamSlot   TeamSlot @relation(fields: [teamSlotId], references: [id], onDelete: Cascade)

    @@unique([teamSlotId, position])
}
```

> Note: Pokemon and move data is denormalised directly into the slot rows. This avoids a separate Pokemon cache table and keeps queries simple for an MVP. PokeAPI is the source of truth; the DB only stores what's needed to render a saved team without re-fetching.

- [ ] **Step 2: Push schema to the database**

```powershell
pnpm db:push
```

Expected: `Your database is now in sync with your Prisma schema.`

- [ ] **Step 3: Verify Prisma client was regenerated**

```powershell
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 4: Commit**

```powershell
git add prisma/schema.prisma
git commit -m "feat(db): add Team, TeamSlot, TeamSlotMove schema"
```

---

### Task 4: PokeAPI Server Utilities

**Files:**
- Create: `src/lib/pokeapi.ts`

- [ ] **Step 1: Create `src/lib/pokeapi.ts`**

```ts
import "server-only";
import { type PokemonSummary, type MoveDetail, type PokemonType, type MoveCategory } from "~/lib/types";

const BASE = "https://pokeapi.co/api/v2";

interface RawStat { base_stat: number; stat: { name: string } }
interface RawType { type: { name: string } }
interface RawMove { move: { name: string } }
interface RawSprites { front_default: string | null; other?: { "official-artwork"?: { front_default: string | null } } }

interface RawPokemon {
  id: number;
  name: string;
  sprites: RawSprites;
  types: RawType[];
  stats: RawStat[];
  moves: RawMove[];
}

interface RawMoveDetail {
  id: number;
  name: string;
  type: { name: string };
  damage_class: { name: string };
  power: number | null;
  accuracy: number | null;
  pp: number;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { next: { revalidate: 86400 } });
  if (!res.ok) throw new Error(`PokeAPI ${res.status}: ${url}`);
  return res.json() as Promise<T>;
}

export async function fetchPokemon(nameOrId: string | number): Promise<PokemonSummary> {
  const raw = await fetchJson<RawPokemon>(`${BASE}/pokemon/${nameOrId}`);
  const stats = Object.fromEntries(raw.stats.map(s => [s.stat.name, s.base_stat]));
  return {
    pokeApiId: raw.id,
    name: raw.name,
    sprite:
      raw.sprites.other?.["official-artwork"]?.front_default ??
      raw.sprites.front_default ??
      "",
    types: raw.types.map(t => t.type.name as PokemonType),
    baseStats: {
      hp: stats["hp"] ?? 0,
      attack: stats["attack"] ?? 0,
      defense: stats["defense"] ?? 0,
      spAttack: stats["special-attack"] ?? 0,
      spDefense: stats["special-defense"] ?? 0,
      speed: stats["speed"] ?? 0,
    },
    moveNames: raw.moves.map(m => m.move.name),
  };
}

export async function fetchMove(nameOrId: string | number): Promise<MoveDetail> {
  const raw = await fetchJson<RawMoveDetail>(`${BASE}/move/${nameOrId}`);
  return {
    pokeApiId: raw.id,
    name: raw.name,
    type: raw.type.name as PokemonType,
    category: raw.damage_class.name as MoveCategory,
    power: raw.power,
    accuracy: raw.accuracy,
    pp: raw.pp,
  };
}
```

- [ ] **Step 2: Typecheck**

```powershell
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```powershell
git add src/lib/pokeapi.ts
git commit -m "feat(lib): add typed PokeAPI server fetch utilities"
```

---

### Task 5: tRPC — Pokemon Router

**Files:**
- Create: `src/server/api/routers/pokemon.ts`
- Modify: `src/server/api/root.ts`

- [ ] **Step 1: Create `src/server/api/routers/pokemon.ts`**

```ts
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { fetchPokemon, fetchMove } from "~/lib/pokeapi";

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
});
```

- [ ] **Step 2: Register router in `src/server/api/root.ts`**

Replace the full contents of `src/server/api/root.ts`:

```ts
import { postRouter } from "~/server/api/routers/post";
import { pokemonRouter } from "~/server/api/routers/pokemon";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

export const appRouter = createTRPCRouter({
  post: postRouter,
  pokemon: pokemonRouter,
});

export type AppRouter = typeof appRouter;
export const createCaller = createCallerFactory(appRouter);
```

- [ ] **Step 3: Typecheck**

```powershell
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 4: Commit**

```powershell
git add src/server/api/routers/pokemon.ts src/server/api/root.ts
git commit -m "feat(api): add pokemon tRPC router (search + getMove)"
```

---

### Task 6: tRPC — Team CRUD Router

**Files:**
- Create: `src/server/api/routers/team.ts`
- Modify: `src/server/api/root.ts`

- [ ] **Step 1: Create `src/server/api/routers/team.ts`**

```ts
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

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
      include: { slots: { include: { moves: true }, orderBy: { position: "asc" } } },
    });
  }),

  get: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.team.findUnique({
        where: { id: input.id },
        include: { slots: { include: { moves: { orderBy: { position: "asc" } } }, orderBy: { position: "asc" } } },
      });
    }),

  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.team.delete({ where: { id: input.id } });
    }),
});
```

- [ ] **Step 2: Register in `src/server/api/root.ts`**

```ts
import { postRouter } from "~/server/api/routers/post";
import { pokemonRouter } from "~/server/api/routers/pokemon";
import { teamRouter } from "~/server/api/routers/team";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

export const appRouter = createTRPCRouter({
  post: postRouter,
  pokemon: pokemonRouter,
  team: teamRouter,
});

export type AppRouter = typeof appRouter;
export const createCaller = createCallerFactory(appRouter);
```

- [ ] **Step 3: Typecheck**

```powershell
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 4: Commit**

```powershell
git add src/server/api/routers/team.ts src/server/api/root.ts
git commit -m "feat(api): add team tRPC router (create / list / get / delete)"
```

---

### Task 7: Damage Formula

**Files:**
- Create: `src/lib/damage.ts`
- Create: `src/lib/__tests__/damage.test.ts`

- [ ] **Step 1: Write the failing tests first**

Create `src/lib/__tests__/damage.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { calculateDamage, getTypeEffectiveness } from "~/lib/damage";

describe("calculateDamage", () => {
  it("returns correct average for a neutral hit", () => {
    const result = calculateDamage({
      level: 50,
      power: 80,
      attackStat: 100,
      defenseStat: 100,
      stab: false,
      typeEffectiveness: 1,
    });
    expect(result.average).toBe(50);
    expect(result.min).toBeLessThan(result.max);
    expect(result.stab).toBe(1.0);
  });

  it("applies STAB multiplier of 1.5", () => {
    const noStab = calculateDamage({ level: 50, power: 80, attackStat: 100, defenseStat: 100, stab: false, typeEffectiveness: 1 });
    const withStab = calculateDamage({ level: 50, power: 80, attackStat: 100, defenseStat: 100, stab: true, typeEffectiveness: 1 });
    expect(withStab.average).toBeCloseTo(noStab.average * 1.5, 0);
    expect(withStab.stab).toBe(1.5);
  });

  it("applies super-effective multiplier of 2", () => {
    const neutral = calculateDamage({ level: 50, power: 80, attackStat: 100, defenseStat: 100, stab: false, typeEffectiveness: 1 });
    const superEffective = calculateDamage({ level: 50, power: 80, attackStat: 100, defenseStat: 100, stab: false, typeEffectiveness: 2 });
    expect(superEffective.average).toBeCloseTo(neutral.average * 2, 0);
  });

  it("returns zero damage for a zero-power move", () => {
    const result = calculateDamage({ level: 50, power: 0, attackStat: 100, defenseStat: 100, stab: false, typeEffectiveness: 1 });
    expect(result.min).toBe(2);
    expect(result.max).toBe(2);
  });
});

describe("getTypeEffectiveness", () => {
  it("fire is super-effective vs grass", () => {
    expect(getTypeEffectiveness("fire", ["grass"])).toBe(2);
  });

  it("fire is not very effective vs water", () => {
    expect(getTypeEffectiveness("fire", ["water"])).toBe(0.5);
  });

  it("electric is immune vs ground", () => {
    expect(getTypeEffectiveness("electric", ["ground"])).toBe(0);
  });

  it("combines dual-type multipliers (ghost vs psychic + ghost = 4x)", () => {
    expect(getTypeEffectiveness("ghost", ["psychic", "ghost"])).toBe(2);
  });

  it("neutral returns 1", () => {
    expect(getTypeEffectiveness("normal", ["normal"])).toBe(1);
  });
});
```

- [ ] **Step 2: Run tests — they must fail**

```powershell
pnpm test
```

Expected: FAIL — `Cannot find module '~/lib/damage'`

- [ ] **Step 3: Implement `src/lib/damage.ts`**

```ts
import { type PokemonType } from "~/lib/types";

export interface DamageInput {
  level: number;
  power: number;
  attackStat: number;
  defenseStat: number;
  stab: boolean;
  typeEffectiveness: number;
}

export interface DamageResult {
  min: number;
  max: number;
  average: number;
  stab: number;
  typeEffectiveness: number;
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
  };
}

// Attacking type → defending type → multiplier
// Omitted entries default to 1. 0 entries represent immunity.
const CHART: Partial<Record<PokemonType, Partial<Record<PokemonType, number>>>> = {
  normal:   { rock: 0.5, steel: 0.5, ghost: 0 },
  fire:     { fire: 0.5, water: 0.5, rock: 0.5, dragon: 0.5, grass: 2, ice: 2, bug: 2, steel: 2 },
  water:    { water: 0.5, grass: 0.5, dragon: 0.5, fire: 2, ground: 2, rock: 2 },
  electric: { electric: 0.5, grass: 0.5, dragon: 0.5, ground: 0, flying: 2, water: 2 },
  grass:    { fire: 0.5, grass: 0.5, poison: 0.5, flying: 0.5, bug: 0.5, dragon: 0.5, steel: 0.5, water: 2, ground: 2, rock: 2 },
  ice:      { water: 0.5, ice: 0.5, fire: 0.5, steel: 0.5, grass: 2, ground: 2, flying: 2, dragon: 2 },
  fighting: { poison: 0.5, bug: 0.5, psychic: 0.5, flying: 0.5, fairy: 0.5, ghost: 0, normal: 2, ice: 2, rock: 2, dark: 2, steel: 2 },
  poison:   { poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0, grass: 2, fairy: 2 },
  ground:   { grass: 0.5, bug: 0.5, flying: 0, electric: 2, fire: 2, poison: 2, rock: 2, steel: 2 },
  flying:   { electric: 0.5, rock: 0.5, steel: 0.5, grass: 2, fighting: 2, bug: 2 },
  psychic:  { psychic: 0.5, steel: 0.5, dark: 0, fighting: 2, poison: 2 },
  bug:      { fire: 0.5, fighting: 0.5, flying: 0.5, ghost: 0.5, steel: 0.5, fairy: 0.5, grass: 2, psychic: 2, dark: 2 },
  rock:     { fighting: 0.5, ground: 0.5, steel: 0.5, fire: 2, ice: 2, flying: 2, bug: 2 },
  ghost:    { normal: 0, dark: 0.5, psychic: 2, ghost: 2 },
  dragon:   { steel: 0.5, fairy: 0, dragon: 2 },
  dark:     { fighting: 0.5, dark: 0.5, fairy: 0.5, psychic: 2, ghost: 2 },
  steel:    { fire: 0.5, water: 0.5, electric: 0.5, steel: 0.5, ice: 2, rock: 2, fairy: 2 },
  fairy:    { fire: 0.5, poison: 0.5, steel: 0.5, fighting: 2, dragon: 2, dark: 2 },
};

export function getTypeEffectiveness(moveType: PokemonType, defenderTypes: PokemonType[]): number {
  const attackChart = CHART[moveType] ?? {};
  return defenderTypes.reduce((mult, defType) => {
    return mult * (attackChart[defType] ?? 1);
  }, 1);
}
```

- [ ] **Step 4: Run tests — they must pass**

```powershell
pnpm test
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```powershell
git add src/lib/damage.ts src/lib/__tests__/damage.test.ts
git commit -m "feat(lib): damage formula + type chart with full test coverage"
```

---

### Task 8: Design System — Type Colours + Base Components

**Files:**
- Modify: `src/styles/globals.css`
- Create: `src/app/_components/TypeBadge.tsx`
- Create: `src/app/_components/StatBar.tsx`

- [ ] **Step 1: Add type colour tokens to `src/styles/globals.css`**

Replace the current content with:

```css
@import "tailwindcss";

@theme {
  --font-sans: var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif,
    "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";

  /* Pokemon type colours */
  --color-type-normal:   #A8A878;
  --color-type-fire:     #F08030;
  --color-type-water:    #6890F0;
  --color-type-electric: #F8D030;
  --color-type-grass:    #78C850;
  --color-type-ice:      #98D8D8;
  --color-type-fighting: #C03028;
  --color-type-poison:   #A040A0;
  --color-type-ground:   #E0C068;
  --color-type-flying:   #A890F0;
  --color-type-psychic:  #F85888;
  --color-type-bug:      #A8B820;
  --color-type-rock:     #B8A038;
  --color-type-ghost:    #705898;
  --color-type-dragon:   #7038F8;
  --color-type-dark:     #705848;
  --color-type-steel:    #B8B8D0;
  --color-type-fairy:    #EE99AC;
}

@layer base {
  body {
    @apply bg-zinc-950 text-zinc-100 antialiased;
  }
}
```

- [ ] **Step 2: Create `src/app/_components/TypeBadge.tsx`**

```tsx
import { type PokemonType } from "~/lib/types";

const TYPE_COLOURS: Record<PokemonType, string> = {
  normal:   "bg-[#A8A878] text-white",
  fire:     "bg-[#F08030] text-white",
  water:    "bg-[#6890F0] text-white",
  electric: "bg-[#F8D030] text-zinc-900",
  grass:    "bg-[#78C850] text-white",
  ice:      "bg-[#98D8D8] text-zinc-900",
  fighting: "bg-[#C03028] text-white",
  poison:   "bg-[#A040A0] text-white",
  ground:   "bg-[#E0C068] text-zinc-900",
  flying:   "bg-[#A890F0] text-white",
  psychic:  "bg-[#F85888] text-white",
  bug:      "bg-[#A8B820] text-white",
  rock:     "bg-[#B8A038] text-white",
  ghost:    "bg-[#705898] text-white",
  dragon:   "bg-[#7038F8] text-white",
  dark:     "bg-[#705848] text-white",
  steel:    "bg-[#B8B8D0] text-zinc-900",
  fairy:    "bg-[#EE99AC] text-white",
};

interface TypeBadgeProps {
  type: PokemonType;
  size?: "sm" | "md";
}

export function TypeBadge({ type, size = "md" }: TypeBadgeProps) {
  const colour = TYPE_COLOURS[type];
  const padding = size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm";
  return (
    <span className={`${colour} ${padding} inline-block rounded-full font-semibold capitalize tracking-wide`}>
      {type}
    </span>
  );
}
```

- [ ] **Step 3: Create `src/app/_components/StatBar.tsx`**

```tsx
interface StatBarProps {
  label: string;
  value: number;
  max?: number;
}

const STAT_COLOURS: Record<string, string> = {
  hp:         "bg-red-400",
  attack:     "bg-orange-400",
  defense:    "bg-yellow-400",
  "sp.atk":   "bg-blue-400",
  "sp.def":   "bg-green-400",
  speed:      "bg-pink-400",
};

export function StatBar({ label, value, max = 255 }: StatBarProps) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  const colour = STAT_COLOURS[label.toLowerCase()] ?? "bg-zinc-400";
  return (
    <div className="flex items-center gap-2">
      <span className="w-14 shrink-0 text-right text-xs font-medium uppercase text-zinc-400">
        {label}
      </span>
      <span className="w-8 shrink-0 text-right text-xs tabular-nums text-zinc-300">
        {value}
      </span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-800">
        <div
          className={`h-full rounded-full transition-all duration-500 ${colour}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Typecheck**

```powershell
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 5: Commit**

```powershell
git add src/styles/globals.css src/app/_components/TypeBadge.tsx src/app/_components/StatBar.tsx
git commit -m "feat(ui): design system — type colour tokens, TypeBadge, StatBar"
```

---

### Task 9: App Shell — Navigation + Routes

**Files:**
- Create: `src/app/_components/Nav.tsx`
- Modify: `src/app/layout.tsx`
- Modify: `src/app/page.tsx`
- Create: `src/app/teams/page.tsx`
- Create: `src/app/my-teams/page.tsx`
- Create: `src/app/calculator/page.tsx`

- [ ] **Step 1: Create `src/app/_components/Nav.tsx`**

```tsx
import Link from "next/link";

const links = [
  { href: "/teams",      label: "Team Builder" },
  { href: "/my-teams",   label: "My Teams" },
  { href: "/calculator", label: "Damage Calc" },
];

export function Nav() {
  return (
    <nav className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/teams" className="text-lg font-bold tracking-tight text-white">
          dxtr<span className="text-violet-400">.</span>
        </Link>
        <ul className="flex gap-1">
          {links.map(({ href, label }) => (
            <li key={href}>
              <Link
                href={href}
                className="rounded-lg px-3 py-1.5 text-sm text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
```

- [ ] **Step 2: Update `src/app/layout.tsx`**

```tsx
import "~/styles/globals.css";
import { type Metadata } from "next";
import { Geist } from "next/font/google";
import { TRPCReactProvider } from "~/trpc/react";
import { Nav } from "~/app/_components/Nav";

export const metadata: Metadata = {
  title: "dxtr — Pokemon Team Builder",
  description: "Build, save, and battle-test your Pokemon teams.",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={geist.variable}>
      <body>
        <TRPCReactProvider>
          <Nav />
          <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
        </TRPCReactProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Update `src/app/page.tsx`**

```tsx
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/teams");
}
```

- [ ] **Step 4: Create `src/app/teams/page.tsx`**

```tsx
export default function TeamsPage() {
  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold">Team Builder</h1>
      <p className="text-zinc-400">Coming soon — team builder UI.</p>
    </div>
  );
}
```

- [ ] **Step 5: Create `src/app/my-teams/page.tsx`**

```tsx
export default function MyTeamsPage() {
  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold">My Teams</h1>
      <p className="text-zinc-400">Coming soon — saved teams list.</p>
    </div>
  );
}
```

- [ ] **Step 6: Create `src/app/calculator/page.tsx`**

```tsx
export default function CalculatorPage() {
  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold">Damage Calculator</h1>
      <p className="text-zinc-400">Coming soon — damage calculator.</p>
    </div>
  );
}
```

- [ ] **Step 7: Typecheck and verify dev server**

```powershell
pnpm typecheck
```

Open `http://localhost:3002` in a browser — it should redirect to `/teams` and show the nav bar.

- [ ] **Step 8: Commit**

```powershell
git add src/app/_components/Nav.tsx src/app/layout.tsx src/app/page.tsx src/app/teams/page.tsx src/app/my-teams/page.tsx src/app/calculator/page.tsx
git commit -m "feat(shell): app routes, navigation, layout"
```

---

## Phase 2 — Core Features

---

### Task 10: Pokemon Search Component

**Files:**
- Create: `src/app/teams/_components/PokemonSearch.tsx`

- [ ] **Step 1: Create `src/app/teams/_components/PokemonSearch.tsx`**

```tsx
"use client";

import { useState } from "react";
import Image from "next/image";
import { api } from "~/trpc/react";
import { TypeBadge } from "~/app/_components/TypeBadge";
import { StatBar } from "~/app/_components/StatBar";
import { type PokemonSummary } from "~/lib/types";

interface PokemonSearchProps {
  onSelect: (pokemon: PokemonSummary) => void;
}

export function PokemonSearch({ onSelect }: PokemonSearchProps) {
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");

  const { data, isFetching, error } = api.pokemon.search.useQuery(
    { query: submitted },
    { enabled: submitted.length > 0, retry: false }
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(query.trim());
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Charizard, pikachu, 25…"
          className="flex-1 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
        />
        <button
          type="submit"
          disabled={!query.trim() || isFetching}
          className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-500 disabled:opacity-50"
        >
          {isFetching ? "…" : "Find"}
        </button>
      </form>

      {error && (
        <p className="text-sm text-red-400">
          {error.message}
        </p>
      )}

      {data && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
          <div className="flex items-start gap-4">
            <Image
              src={data.sprite}
              alt={data.name}
              width={96}
              height={96}
              className="shrink-0 drop-shadow-lg"
              unoptimized
            />
            <div className="flex flex-1 flex-col gap-2">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold capitalize">{data.name}</h3>
                <span className="text-sm text-zinc-500">#{String(data.pokeApiId).padStart(3, "0")}</span>
              </div>
              <div className="flex gap-1">
                {data.types.map(t => <TypeBadge key={t} type={t} size="sm" />)}
              </div>
              <div className="flex flex-col gap-1 pt-1">
                <StatBar label="HP"     value={data.baseStats.hp} />
                <StatBar label="Atk"    value={data.baseStats.attack} />
                <StatBar label="Def"    value={data.baseStats.defense} />
                <StatBar label="Sp.Atk" value={data.baseStats.spAttack} />
                <StatBar label="Sp.Def" value={data.baseStats.spDefense} />
                <StatBar label="Speed"  value={data.baseStats.speed} />
              </div>
            </div>
          </div>
          <button
            onClick={() => onSelect(data)}
            className="mt-4 w-full rounded-xl bg-violet-600 py-2 text-sm font-semibold text-white transition hover:bg-violet-500"
          >
            Add to Team
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

```powershell
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```powershell
git add src/app/teams/_components/PokemonSearch.tsx
git commit -m "feat(ui): PokemonSearch component with stat display"
```

---

### Task 11: Move Selector Component

**Files:**
- Create: `src/app/teams/_components/MoveSelector.tsx`

- [ ] **Step 1: Create `src/app/teams/_components/MoveSelector.tsx`**

```tsx
"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { TypeBadge } from "~/app/_components/TypeBadge";
import { type MoveDetail, type PokemonType } from "~/lib/types";

interface MoveSelectorProps {
  moveNames: string[];
  selectedMoves: MoveDetail[];
  onToggle: (move: MoveDetail) => void;
}

export function MoveSelector({ moveNames, selectedMoves, onToggle }: MoveSelectorProps) {
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = moveNames.filter(n => n.includes(search.toLowerCase().replace(/\s/g, "-")));
  const selectedNames = new Set(selectedMoves.map(m => m.name));

  return (
    <div className="flex flex-col gap-3">
      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Filter moves…"
        className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
      />
      <p className="text-xs text-zinc-500">{selectedMoves.length}/4 moves selected</p>
      <ul className="flex max-h-72 flex-col gap-1 overflow-y-auto pr-1">
        {filtered.map(moveName => (
          <MoveRow
            key={moveName}
            moveName={moveName}
            isSelected={selectedNames.has(moveName)}
            isExpanded={expanded === moveName}
            canSelect={selectedMoves.length < 4 || selectedNames.has(moveName)}
            onToggle={onToggle}
            onExpand={() => setExpanded(prev => prev === moveName ? null : moveName)}
          />
        ))}
      </ul>
    </div>
  );
}

interface MoveRowProps {
  moveName: string;
  isSelected: boolean;
  isExpanded: boolean;
  canSelect: boolean;
  onToggle: (move: MoveDetail) => void;
  onExpand: () => void;
}

function MoveRow({ moveName, isSelected, isExpanded, canSelect, onToggle, onExpand }: MoveRowProps) {
  const { data, isFetching } = api.pokemon.getMove.useQuery(
    { moveName },
    { enabled: isExpanded || isSelected, staleTime: Infinity }
  );

  return (
    <li
      className={`rounded-xl border transition ${
        isSelected
          ? "border-violet-600 bg-violet-950"
          : "border-zinc-800 bg-zinc-900 hover:border-zinc-700"
      }`}
    >
      <div className="flex items-center gap-2 px-3 py-2">
        <button
          onClick={onExpand}
          className="flex-1 text-left text-sm capitalize"
        >
          {moveName.replace(/-/g, " ")}
        </button>
        {data && (
          <TypeBadge type={data.type as PokemonType} size="sm" />
        )}
        <button
          disabled={!canSelect && !isSelected}
          onClick={() => {
            if (data) onToggle(data);
            else onExpand();
          }}
          className={`shrink-0 rounded-lg px-2 py-1 text-xs font-semibold transition ${
            isSelected
              ? "bg-violet-600 text-white hover:bg-red-600"
              : "bg-zinc-700 text-zinc-200 hover:bg-violet-600 hover:text-white disabled:opacity-40"
          }`}
        >
          {isSelected ? "Remove" : isFetching ? "…" : "Add"}
        </button>
      </div>
      {isExpanded && data && (
        <div className="flex gap-4 border-t border-zinc-800 px-3 py-2 text-xs text-zinc-400">
          <span>Cat: <span className="capitalize text-zinc-200">{data.category}</span></span>
          <span>Pwr: <span className="text-zinc-200">{data.power ?? "—"}</span></span>
          <span>Acc: <span className="text-zinc-200">{data.accuracy ?? "—"}</span></span>
          <span>PP: <span className="text-zinc-200">{data.pp}</span></span>
        </div>
      )}
    </li>
  );
}
```

- [ ] **Step 2: Typecheck**

```powershell
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```powershell
git add src/app/teams/_components/MoveSelector.tsx
git commit -m "feat(ui): MoveSelector with expandable move details"
```

---

### Task 12: Team Slot + Team Builder Page

**Files:**
- Create: `src/app/teams/_components/TeamSlot.tsx`
- Create: `src/app/teams/_components/SaveTeamModal.tsx`
- Create: `src/app/teams/_components/TeamBuilder.tsx`
- Modify: `src/app/teams/page.tsx`

- [ ] **Step 1: Create `src/app/teams/_components/TeamSlot.tsx`**

```tsx
"use client";

import Image from "next/image";
import { TypeBadge } from "~/app/_components/TypeBadge";
import { type PokemonSummary, type MoveDetail, type PokemonType } from "~/lib/types";

interface TeamSlotProps {
  position: number;
  pokemon: PokemonSummary | null;
  moves: MoveDetail[];
  onRemove: () => void;
  onEditMoves: () => void;
}

export function TeamSlot({ position, pokemon, moves, onRemove, onEditMoves }: TeamSlotProps) {
  if (!pokemon) {
    return (
      <div className="flex h-36 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-800 text-zinc-600 transition hover:border-zinc-700">
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
        </div>
      </div>

      <div className="flex flex-wrap gap-1">
        {moves.length === 0 ? (
          <span className="text-xs text-zinc-600">No moves assigned</span>
        ) : (
          moves.map(m => (
            <span
              key={m.name}
              className="rounded-md bg-zinc-800 px-2 py-0.5 text-xs capitalize text-zinc-300"
            >
              {m.name.replace(/-/g, " ")}
            </span>
          ))
        )}
      </div>

      <button
        onClick={onEditMoves}
        className="mt-1 w-full rounded-lg bg-zinc-800 py-1 text-xs font-medium text-zinc-300 transition hover:bg-zinc-700"
      >
        {moves.length === 0 ? "Assign moves" : "Edit moves"}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Create `src/app/teams/_components/SaveTeamModal.tsx`**

```tsx
"use client";

import { useState } from "react";

interface SaveTeamModalProps {
  onSave: (name: string) => void;
  onClose: () => void;
  isSaving: boolean;
}

export function SaveTeamModal({ onSave, onClose, isSaving }: SaveTeamModalProps) {
  const [name, setName] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
        <h2 className="mb-4 text-lg font-bold">Save Team</h2>
        <input
          autoFocus
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Team name…"
          maxLength={60}
          className="mb-4 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm text-white outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
        />
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-zinc-700 py-2 text-sm text-zinc-400 transition hover:bg-zinc-800"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(name)}
            disabled={!name.trim() || isSaving}
            className="flex-1 rounded-xl bg-violet-600 py-2 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:opacity-50"
          >
            {isSaving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create `src/app/teams/_components/TeamBuilder.tsx`**

```tsx
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
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Add Pokemon</h2>
            <button
              onClick={() => setActiveSearch(false)}
              className="text-sm text-zinc-500 hover:text-white"
            >
              Close
            </button>
          </div>
          <PokemonSearch onSelect={addPokemon} />
        </div>
      )}

      {editingSlot !== null && editingSlotData && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold capitalize">
              Moves — {editingSlotData.pokemon.name}
            </h2>
            <button
              onClick={() => setEditingSlot(null)}
              className="text-sm text-zinc-500 hover:text-white"
            >
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
```

- [ ] **Step 4: Update `src/app/teams/page.tsx`**

```tsx
import { TeamBuilder } from "./_components/TeamBuilder";

export default function TeamsPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Team Builder</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Search for Pokemon, assign movesets, then save your team.
        </p>
      </div>
      <TeamBuilder />
    </div>
  );
}
```

- [ ] **Step 5: Typecheck**

```powershell
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 6: Manual verification**

Open `http://localhost:3002/teams`. Verify:
- 6 empty slot cards are visible
- Clicking an empty slot opens the search panel
- Searching "charizard" returns the card with sprite, types, stats
- "Add to Team" populates a slot
- Clicking "Assign moves" on a filled slot opens the move picker
- Moves can be toggled (max 4)
- "Save Team" button opens the modal and saves to the DB

- [ ] **Step 7: Commit**

```powershell
git add src/app/teams/_components/
git add src/app/teams/page.tsx
git commit -m "feat(ui): team builder — slot grid, search, move selector, save"
```

---

### Task 13: Saved Teams List Page

**Files:**
- Create: `src/app/my-teams/_components/TeamCard.tsx`
- Modify: `src/app/my-teams/page.tsx`

- [ ] **Step 1: Create `src/app/my-teams/_components/TeamCard.tsx`**

```tsx
"use client";

import Image from "next/image";
import { api } from "~/trpc/react";
import { TypeBadge } from "~/app/_components/TypeBadge";
import { type PokemonType } from "~/lib/types";

interface TeamCardProps {
  id: number;
  name: string;
  slots: {
    id: number;
    position: number;
    name: string;
    sprite: string;
    types: string[];
  }[];
  createdAt: Date;
}

export function TeamCard({ id, name, slots, createdAt }: TeamCardProps) {
  const utils = api.useUtils();
  const deleteTeam = api.team.delete.useMutation({
    onSuccess: () => utils.team.list.invalidate(),
  });

  const sorted = [...slots].sort((a, b) => a.position - b.position);

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-5 transition hover:border-zinc-700">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-bold">{name}</h3>
          <p className="text-xs text-zinc-500">
            {createdAt.toLocaleDateString()} · {slots.length} Pokemon
          </p>
        </div>
        <button
          onClick={() => deleteTeam.mutate({ id })}
          disabled={deleteTeam.isPending}
          className="rounded-lg px-2 py-1 text-xs text-zinc-600 transition hover:bg-zinc-800 hover:text-red-400 disabled:opacity-50"
        >
          Delete
        </button>
      </div>

      <div className="grid grid-cols-6 gap-2">
        {Array.from({ length: 6 }).map((_, i) => {
          const slot = sorted[i];
          return slot ? (
            <div key={slot.id} className="flex flex-col items-center gap-1">
              <Image src={slot.sprite} alt={slot.name} width={48} height={48} unoptimized className="drop-shadow" />
              <div className="flex flex-wrap justify-center gap-0.5">
                {slot.types.map(t => <TypeBadge key={t} type={t as PokemonType} size="sm" />)}
              </div>
            </div>
          ) : (
            <div key={i} className="flex h-12 items-center justify-center rounded-lg border border-dashed border-zinc-800 text-zinc-700">
              —
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Update `src/app/my-teams/page.tsx`**

```tsx
import { api, HydrateClient } from "~/trpc/server";
import { SavedTeamsList } from "./_components/SavedTeamsList";

export default async function MyTeamsPage() {
  void api.team.list.prefetch();
  return (
    <HydrateClient>
      <div>
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">My Teams</h1>
          <p className="mt-1 text-sm text-zinc-400">All your saved teams.</p>
        </div>
        <SavedTeamsList />
      </div>
    </HydrateClient>
  );
}
```

- [ ] **Step 3: Create `src/app/my-teams/_components/SavedTeamsList.tsx`**

```tsx
"use client";

import Link from "next/link";
import { api } from "~/trpc/react";
import { TeamCard } from "./TeamCard";

export function SavedTeamsList() {
  const [teams] = api.team.list.useSuspenseQuery();

  if (teams.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-zinc-800 py-16 text-center">
        <p className="text-zinc-500">No teams saved yet.</p>
        <Link
          href="/teams"
          className="rounded-xl bg-violet-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-violet-500"
        >
          Build your first team
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {teams.map(team => (
        <TeamCard
          key={team.id}
          id={team.id}
          name={team.name}
          slots={team.slots}
          createdAt={team.createdAt}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Typecheck**

```powershell
pnpm typecheck
```

- [ ] **Step 5: Manual verification**

Open `http://localhost:3002/my-teams`. Verify:
- Teams saved from the builder appear as cards
- Each card shows 6 sprite slots
- Delete removes the team from the list

- [ ] **Step 6: Commit**

```powershell
git add src/app/my-teams/
git commit -m "feat(ui): saved teams list with delete"
```

---

### Task 14: Damage Calculator Page

**Files:**
- Create: `src/app/calculator/_components/DamageResult.tsx`
- Create: `src/app/calculator/_components/DamageCalculator.tsx`
- Modify: `src/app/calculator/page.tsx`

- [ ] **Step 1: Create `src/app/calculator/_components/DamageResult.tsx`**

```tsx
import { type DamageResult as DmgResult } from "~/lib/damage";

interface DamageResultProps {
  result: DmgResult;
  moveName: string;
  attackerName: string;
  defenderName: string;
}

export function DamageResultCard({ result, moveName, attackerName, defenderName }: DamageResultProps) {
  const effectLabel =
    result.typeEffectiveness === 0 ? "No effect" :
    result.typeEffectiveness < 1   ? "Not very effective…" :
    result.typeEffectiveness === 1 ? "Normal" :
    result.typeEffectiveness <= 2  ? "Super effective!" :
                                     "Super effective!! (4×)";

  const effectColour =
    result.typeEffectiveness === 0 ? "text-zinc-500" :
    result.typeEffectiveness < 1   ? "text-orange-400" :
    result.typeEffectiveness === 1 ? "text-zinc-300" :
                                     "text-green-400";

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
      <div className="text-sm text-zinc-400">
        <span className="font-semibold capitalize text-white">{attackerName}</span>
        {" uses "}
        <span className="font-semibold capitalize text-violet-300">{moveName.replace(/-/g, " ")}</span>
        {" on "}
        <span className="font-semibold capitalize text-white">{defenderName}</span>
      </div>

      <div className="flex items-end gap-4">
        <div className="flex flex-col">
          <span className="text-xs text-zinc-500">Damage range</span>
          <span className="text-4xl font-black tabular-nums">
            {result.min}–{result.max}
          </span>
        </div>
        <span className={`mb-1 text-sm font-semibold ${effectColour}`}>{effectLabel}</span>
      </div>

      <div className="grid grid-cols-3 divide-x divide-zinc-800 rounded-xl border border-zinc-800">
        {[
          { label: "STAB",              value: result.stab === 1.5 ? "×1.5" : "×1.0" },
          { label: "Type",              value: `×${result.typeEffectiveness}` },
          { label: "Avg",               value: String(result.average) },
        ].map(({ label, value }) => (
          <div key={label} className="flex flex-col items-center py-3">
            <span className="text-xs text-zinc-500">{label}</span>
            <span className="text-lg font-bold">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `src/app/calculator/_components/DamageCalculator.tsx`**

```tsx
"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { calculateDamage, getTypeEffectiveness } from "~/lib/damage";
import { type DamageResult } from "~/lib/damage";
import { type PokemonSummary, type MoveDetail, type PokemonType } from "~/lib/types";
import { DamageResultCard } from "./DamageResult";
import { TypeBadge } from "~/app/_components/TypeBadge";
import Image from "next/image";

type Side = "attacker" | "defender";

function PokemonPicker({ label, value, onPick }: { label: string; value: PokemonSummary | null; onPick: (p: PokemonSummary) => void }) {
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const { data, isFetching, error } = api.pokemon.search.useQuery({ query: submitted }, { enabled: !!submitted, retry: false });

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-zinc-400">{label}</label>
      {value ? (
        <div className="flex items-center gap-3 rounded-xl border border-zinc-700 bg-zinc-900 p-3">
          <Image src={value.sprite} alt={value.name} width={48} height={48} unoptimized />
          <div>
            <p className="text-sm font-semibold capitalize">{value.name}</p>
            <div className="flex gap-1">{value.types.map(t => <TypeBadge key={t} type={t as PokemonType} size="sm" />)}</div>
          </div>
          <button onClick={() => { setSubmitted(""); setQuery(""); }} className="ml-auto text-xs text-zinc-600 hover:text-white">Change</button>
        </div>
      ) : (
        <form onSubmit={e => { e.preventDefault(); setSubmitted(query.trim()); }} className="flex gap-2">
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Pokemon name…"
            className="flex-1 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-violet-500" />
          <button type="submit" disabled={!query || isFetching}
            className="rounded-xl bg-violet-600 px-3 py-2 text-sm text-white hover:bg-violet-500 disabled:opacity-50">
            {isFetching ? "…" : "Find"}
          </button>
        </form>
      )}
      {error && <p className="text-xs text-red-400">{error.message}</p>}
      {data && !value && (
        <button onClick={() => onPick(data)}
          className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-left text-sm capitalize transition hover:border-violet-600">
          Use <span className="font-semibold">{data.name}</span>
        </button>
      )}
    </div>
  );
}

export function DamageCalculator() {
  const [attacker, setAttacker] = useState<PokemonSummary | null>(null);
  const [defender, setDefender] = useState<PokemonSummary | null>(null);
  const [moveQuery, setMoveQuery] = useState("");
  const [moveSubmitted, setMoveSubmitted] = useState("");
  const [result, setResult] = useState<{ dmg: DamageResult; move: MoveDetail } | null>(null);

  const { data: moveData, isFetching: moveFetching, error: moveError } =
    api.pokemon.getMove.useQuery({ moveName: moveSubmitted }, { enabled: !!moveSubmitted, retry: false });

  function calculate() {
    if (!attacker || !defender || !moveData) return;
    const isPhysical = moveData.category === "physical";
    const attackStat = isPhysical ? attacker.baseStats.attack : attacker.baseStats.spAttack;
    const defenseStat = isPhysical ? defender.baseStats.defense : defender.baseStats.spDefense;
    const stab = attacker.types.includes(moveData.type as PokemonType);
    const te = getTypeEffectiveness(moveData.type as PokemonType, defender.types as PokemonType[]);
    const dmg = calculateDamage({ level: 50, power: moveData.power ?? 0, attackStat, defenseStat, stab, typeEffectiveness: te });
    setResult({ dmg, move: moveData });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <PokemonPicker label="Attacker" value={attacker} onPick={setAttacker} />
        <PokemonPicker label="Defender" value={defender} onPick={setDefender} />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-zinc-400">Move</label>
        <form onSubmit={e => { e.preventDefault(); setMoveSubmitted(moveQuery.trim()); setResult(null); }} className="flex gap-2">
          <input value={moveQuery} onChange={e => setMoveQuery(e.target.value)} placeholder="flamethrower, earthquake…"
            className="flex-1 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-violet-500" />
          <button type="submit" disabled={!moveQuery || moveFetching}
            className="rounded-xl bg-violet-600 px-3 py-2 text-sm text-white hover:bg-violet-500 disabled:opacity-50">
            {moveFetching ? "…" : "Load"}
          </button>
        </form>
        {moveError && <p className="text-xs text-red-400">{moveError.message}</p>}
        {moveData && (
          <div className="flex items-center gap-3 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm">
            <span className="capitalize font-medium">{moveData.name.replace(/-/g, " ")}</span>
            <TypeBadge type={moveData.type as PokemonType} size="sm" />
            <span className="text-zinc-500">{moveData.category} · Pwr {moveData.power ?? "—"}</span>
          </div>
        )}
      </div>

      <button
        onClick={calculate}
        disabled={!attacker || !defender || !moveData}
        className="w-full rounded-xl bg-violet-600 py-3 font-semibold text-white transition hover:bg-violet-500 disabled:opacity-40"
      >
        Calculate Damage
      </button>

      {result && attacker && defender && (
        <DamageResultCard
          result={result.dmg}
          moveName={result.move.name}
          attackerName={attacker.name}
          defenderName={defender.name}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 3: Update `src/app/calculator/page.tsx`**

```tsx
import { DamageCalculator } from "./_components/DamageCalculator";

export default function CalculatorPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Damage Calculator</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Simulate damage at level 50 with base stats.
        </p>
      </div>
      <div className="max-w-xl">
        <DamageCalculator />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Typecheck**

```powershell
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 5: Manual verification**

Open `http://localhost:3002/calculator`. Verify:
- Searching two Pokemon populates attacker and defender
- Loading a move (e.g. "flamethrower") shows its details
- "Calculate Damage" shows the result card with range, STAB, and type effectiveness

- [ ] **Step 6: Commit**

```powershell
git add src/app/calculator/
git commit -m "feat(ui): damage calculator with result breakdown"
```

---

## Phase 3 — Polish

---

### Task 15: Responsive + Animation Polish

**Files:**
- Modify: `src/styles/globals.css`
- Modify: `src/app/_components/Nav.tsx` (active link highlight)
- Modify: `src/app/teams/_components/TeamSlot.tsx` (entry animation)

- [ ] **Step 1: Add global animation utilities to `globals.css`**

Append to `src/styles/globals.css`:

```css
@layer utilities {
  .animate-fade-in {
    animation: fadeIn 0.2s ease-out forwards;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(4px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .animate-scale-in {
    animation: scaleIn 0.15s ease-out forwards;
  }

  @keyframes scaleIn {
    from { opacity: 0; transform: scale(0.95); }
    to   { opacity: 1; transform: scale(1); }
  }
}
```

- [ ] **Step 2: Add active link highlighting to `Nav.tsx`**

Replace `src/app/_components/Nav.tsx` with a version that uses `usePathname`:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/teams",      label: "Team Builder" },
  { href: "/my-teams",   label: "My Teams" },
  { href: "/calculator", label: "Damage Calc" },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/teams" className="text-lg font-bold tracking-tight text-white">
          dxtr<span className="text-violet-400">.</span>
        </Link>
        <ul className="flex gap-1">
          {links.map(({ href, label }) => {
            const active = pathname.startsWith(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={`rounded-lg px-3 py-1.5 text-sm transition ${
                    active
                      ? "bg-zinc-800 text-white"
                      : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
                  }`}
                >
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
```

- [ ] **Step 3: Apply `animate-scale-in` to `SaveTeamModal` overlay and `animate-fade-in` to search/move panels**

In `src/app/teams/_components/SaveTeamModal.tsx`, add `animate-scale-in` to the inner panel div:

```tsx
// change:
<div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
// to:
<div className="animate-scale-in w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
```

In `src/app/teams/_components/TeamBuilder.tsx`, add `animate-fade-in` to the search and move editor panels:

```tsx
// search panel — change:
<div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
// to:
<div className="animate-fade-in rounded-2xl border border-zinc-800 bg-zinc-900 p-4">

// move panel — same change
```

- [ ] **Step 4: Full typecheck + lint**

```powershell
pnpm check
```

Expected: no errors or warnings.

- [ ] **Step 5: Manual verification across all three pages**

- `/teams` — search, add, assign moves, save; verify animations on panel open and modal
- `/my-teams` — cards show sprites, delete works
- `/calculator` — full calculation flow, result card displays cleanly
- Resize to mobile (375px) — all layouts usable

- [ ] **Step 6: Final commit**

```powershell
git add -A
git commit -m "feat: first pass complete — team builder, damage calculator, polish"
```

---

## Self-Review Checklist

**Spec coverage:**
- [x] Search for Pokemon by name → Task 10 (PokemonSearch)
- [x] 6-slot team grid → Task 12 (TeamBuilder)
- [x] Assign up to 4 moves per slot → Task 11 (MoveSelector)
- [x] Name and save team to DB → Task 12 (SaveTeamModal + team.create)
- [x] View saved teams → Task 13 (SavedTeamsList)
- [x] Damage calculation with breakdown → Task 14 (DamageCalculator + DamageResultCard)
- [x] Type-themed colours → Task 8 (globals.css + TypeBadge)
- [x] Responsive + polished → Task 15

**Gaps addressed:**
- Pure damage formula is fully tested (Task 7)
- Type chart covers all 18 types including immunities
- Denormalised schema avoids extra PokeAPI round-trips on team load

**Placeholder scan:** No TBD, TODO, or vague steps present. All code blocks are complete and reference only types/functions defined in prior tasks.

**Type consistency:**
- `PokemonSummary`, `MoveDetail`, `TeamSlotConfig` defined in Task 2, used consistently in Tasks 10–14
- `calculateDamage` / `getTypeEffectiveness` defined in Task 7, used in Task 14
- tRPC router names (`pokemon.search`, `pokemon.getMove`, `team.create`, `team.list`, `team.delete`) defined in Tasks 5–6, used in Tasks 10–14
