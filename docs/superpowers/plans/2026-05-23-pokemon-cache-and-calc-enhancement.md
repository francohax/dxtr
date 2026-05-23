# Pokemon Cache + Calculator Enhancement Bundle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cache all canonical Pokemon into the local database (removing PokeAPI runtime dependency), ship a monthly refresh script, redesign the calculator into a two-column grid for large screens, add type-filtered Pokemon search with digit hotkeys, apply glassmorphism shimmer loading states, and visually upgrade the UI background and components.

**Architecture:** The Prisma `CachedPokemon` table becomes the primary data source for `pokemon.listNames`, `pokemon.listSummaries`, and `pokemon.search`, with PokeAPI as a fallback when the table is empty. The calculator page switches from a single max-w-2xl column to a responsive two-column grid (`lg:grid-cols-[1fr_1.4fr]`) where the left column holds the Pokemon pickers and the right column holds controls + results. Type filtering lives in a new `TypeFilterBar` component wired into `PokemonPickerModal`, which migrates from `listNames` to the richer `listSummaries` procedure.

**Tech Stack:** Next.js 15 App Router · tRPC 11 · Prisma 6 + PostgreSQL · React 19 · Tailwind CSS v4 · TypeScript · tsx (new dev dep for seed scripts)

---

## BA Brief

### User Stories
1. As a user, I want the app to load Pokemon data instantly and reliably, so slow or unavailable PokeAPI calls don't degrade my experience.
2. As a developer, I want a monthly refresh script I can cron-schedule, so the local cache stays current when new Pokemon are added.
3. As a user on a large screen, I want the calculator laid out as a grid, so I can see pickers and results side-by-side without scrolling.
4. As a user, I want to filter the Pokemon picker by type (including dual-types), so I can quickly find candidates for a given matchup.
5. As a power user, I want digit hotkeys (1–0) inside the picker to toggle type filters, so I never need to reach for the mouse.
6. As a user, I want smooth shimmer loading overlays instead of raw "Loading…" text, so the app feels polished while data fetches.
7. As a user, I want a more interesting and slightly brighter background plus updated component styling, so the app has more energy and personality.

### Acceptance Criteria
- `CachedPokemon` table exists in the schema and seed script populates it for all PokeAPI Pokemon (~1302+).
- `pnpm db:seed-pokemon` runs to completion, upserts all Pokemon, prints progress.
- `scripts/update-pokemon-cache.sh` is executable and includes cron example comments.
- `pokemon.listNames` and `pokemon.listSummaries` serve from the DB; empty DB falls back to PokeAPI.
- Calculator page renders in a two-column grid at ≥ lg breakpoint; single column on mobile.
- `PokemonPickerModal` shows a `TypeFilterBar` with all 18 types; multi-select narrows the results.
- Pressing digit `1`–`0` while the modal is open (and not in the text input) toggles the first 10 types.
- Components that await data show a shimmer overlay instead of raw spinners or "Loading…" strings.
- Background uses multiple radial gradients and a lighter base (`bg-zinc-900`); component cards use `bg-zinc-800/30` + `border-zinc-700/50`.

### Out of Scope
- Move data caching (moves are already fast enough; PokeAPI move endpoint stays as-is).
- Specific Pokemon Champions game roster filtering (no public API exists yet; seed script documents how to add it).
- Authentication or user-specific cached data.

### Open Questions
- None — PokeAPI is the canonical source; the monthly script keeps parity with any new additions.

---

## Ticket Plan

**Status:** PENDING REVIEW

| ID    | Title                                      | Type | Assignee   | Priority | Points | Depends On    |
|-------|--------------------------------------------|------|------------|----------|--------|---------------|
| DX-11 | Prisma: Add `CachedPokemon` model          | task | Junior B   | P0       | 2      | —             |
| DX-12 | Seed script: populate cache from PokeAPI   | task | Junior B   | P0       | 5      | DX-11         |
| DX-13 | Monthly update script + npm scripts        | task | Junior B   | P1       | 2      | DX-12         |
| DX-14 | tRPC router: serve from DB cache           | task | Senior Dev | P1       | 3      | DX-11         |
| DX-15 | Calculator: two-column grid layout         | task | Junior A   | P1       | 3      | —             |
| DX-16 | `TypeFilterBar` component                  | task | Junior A   | P1       | 3      | —             |
| DX-17 | `PokemonPickerModal`: type filter + hotkeys| task | Junior A   | P2       | 3      | DX-14, DX-16  |
| DX-18 | `GlassLoader` + `SkeletonBlock` components | task | Junior A   | P2       | 2      | —             |
| DX-19 | Apply loading states across calculator     | task | Junior A   | P2       | 2      | DX-18         |
| DX-20 | UI polish: background + component styling  | task | Junior A   | P2       | 5      | —             |

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `prisma/schema.prisma` | Add `CachedPokemon` model |
| Create | `scripts/seed-pokemon-cache.ts` | Fetch all Pokemon from PokeAPI → upsert to DB |
| Create | `scripts/update-pokemon-cache.sh` | Shell wrapper with cron example |
| Modify | `package.json` | Add `db:seed-pokemon` and `db:update-pokemon` scripts |
| Modify | `src/server/api/routers/pokemon.ts` | Use DB cache; add `listSummaries` procedure |
| Modify | `src/app/calculator/page.tsx` | Widen max-w constraint for large screens |
| Modify | `src/app/calculator/_components/DamageCalculator.tsx` | Two-column grid layout |
| Create | `src/app/calculator/_components/TypeFilterBar.tsx` | Type filter pill bar + HOTKEY_MAP |
| Modify | `src/app/calculator/_components/PokemonPickerModal.tsx` | Integrate type filter + hotkeys |
| Create | `src/app/_components/GlassLoader.tsx` | Shimmer overlay component |
| Create | `src/app/_components/SkeletonBlock.tsx` | Inline skeleton placeholder |
| Modify | `src/app/calculator/_components/DamageResult.tsx` | Subtle move-type accent border |
| Modify | `src/styles/globals.css` | Background gradients + shimmer keyframe + glass-card utility |
| Modify | `src/app/layout.tsx` | No change needed (max-w is on page, not layout) |

---

## Task 1 — DX-11: Prisma `CachedPokemon` model

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add the model**

Append after the last model in `prisma/schema.prisma`:

```prisma
model CachedPokemon {
  id        Int      @id             // matches PokeAPI id (1–1302+)
  name      String   @unique
  sprite    String
  types     String[]
  hp        Int
  attack    Int
  defense   Int
  spAttack  Int
  spDefense Int
  speed     Int
  moveNames String[]
  cachedAt  DateTime @updatedAt
}
```

- [ ] **Step 2: Push schema to DB**

```bash
pnpm db:push
```

Expected: `Your database is now in sync with your Prisma schema.`

- [ ] **Step 3: Verify Prisma client regenerated**

```bash
pnpm typecheck
```

Expected: exits 0 with no errors.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(db): add CachedPokemon model for local Pokemon data cache"
```

---

## Task 2 — DX-12: Seed script

**Files:**
- Create: `scripts/seed-pokemon-cache.ts`
- Modify: `package.json` (scripts section)

- [ ] **Step 1: Add `tsx` as a dev dependency**

```bash
pnpm add -D tsx
```

Expected: `tsx` appears in `devDependencies` in `package.json`.

- [ ] **Step 2: Create the seed script**

Create `scripts/seed-pokemon-cache.ts` with this exact content:

```typescript
import { PrismaClient } from "../generated/prisma/index.js";

const prisma = new PrismaClient();
const BASE = "https://pokeapi.co/api/v2";
const CONCURRENCY = 8;

interface RawStat { base_stat: number; stat: { name: string } }
interface RawType { type: { name: string } }
interface RawMove { move: { name: string } }
interface RawSprites {
  front_default: string | null;
  other?: { "official-artwork"?: { front_default: string | null } };
}
interface RawPokemon {
  id: number;
  name: string;
  sprites: RawSprites;
  types: RawType[];
  stats: RawStat[];
  moves: RawMove[];
}

async function fetchAllNames(): Promise<string[]> {
  const res = await fetch(`${BASE}/pokemon?limit=10000&offset=0`);
  if (!res.ok) throw new Error(`Failed to list Pokemon: ${res.status}`);
  const data = (await res.json()) as { results: { name: string }[] };
  return data.results.map((p) => p.name);
}

async function upsertPokemon(name: string): Promise<void> {
  const res = await fetch(`${BASE}/pokemon/${name}`);
  if (!res.ok) {
    process.stdout.write(`  ⚠ skip ${name} (${res.status})\n`);
    return;
  }
  const raw = (await res.json()) as RawPokemon;
  const stats = Object.fromEntries(raw.stats.map((s) => [s.stat.name, s.base_stat]));
  const sprite =
    raw.sprites.other?.["official-artwork"]?.front_default ??
    raw.sprites.front_default ??
    "";
  const payload = {
    name: raw.name,
    sprite,
    types: raw.types.map((t) => t.type.name),
    hp: stats["hp"] ?? 0,
    attack: stats["attack"] ?? 0,
    defense: stats["defense"] ?? 0,
    spAttack: stats["special-attack"] ?? 0,
    spDefense: stats["special-defense"] ?? 0,
    speed: stats["speed"] ?? 0,
    moveNames: raw.moves.map((m) => m.move.name),
  };
  await prisma.cachedPokemon.upsert({
    where: { id: raw.id },
    create: { id: raw.id, ...payload },
    update: payload,
  });
}

async function main() {
  console.log("Fetching Pokemon list from PokeAPI…");
  const names = await fetchAllNames();
  console.log(`Seeding ${names.length} Pokemon (${CONCURRENCY} parallel)…`);

  for (let i = 0; i < names.length; i += CONCURRENCY) {
    const batch = names.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map((n) => upsertPokemon(n)));
    const done = Math.min(i + CONCURRENCY, names.length);
    process.stdout.write(`\r  ${done}/${names.length} (${Math.round((done / names.length) * 100)}%)`);
  }

  console.log("\nDone — Pokemon cache is up to date.");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  void prisma.$disconnect();
  process.exit(1);
});
```

- [ ] **Step 3: Add npm scripts to `package.json`**

In the `"scripts"` section of `package.json`, add two entries (after `"db:studio"`):

```json
"db:seed-pokemon": "tsx scripts/seed-pokemon-cache.ts",
"db:update-pokemon": "tsx scripts/seed-pokemon-cache.ts",
```

- [ ] **Step 4: Typecheck the script**

```bash
pnpm typecheck
```

Expected: exits 0.

- [ ] **Step 5: Run the seed (this takes ~3–5 minutes — grab a coffee)**

```bash
pnpm db:seed-pokemon
```

Expected output ends with: `Done — Pokemon cache is up to date.`

- [ ] **Step 6: Verify row count**

```bash
pnpm db:studio
```

Open `CachedPokemon` table in the browser. Confirm row count ≥ 1302.

- [ ] **Step 7: Commit**

```bash
git add scripts/seed-pokemon-cache.ts package.json
git commit -m "feat(scripts): add Pokemon cache seed script with PokeAPI upsert"
```

---

## Task 3 — DX-13: Monthly update script

**Files:**
- Create: `scripts/update-pokemon-cache.sh`

- [ ] **Step 1: Create the shell script**

Create `scripts/update-pokemon-cache.sh`:

```bash
#!/usr/bin/env bash
# Monthly Pokemon cache refresh
# ─────────────────────────────
# Run manually:   bash scripts/update-pokemon-cache.sh
# Cron (monthly, 3am on the 1st):
#   0 3 1 * * cd /absolute/path/to/dxtr && bash scripts/update-pokemon-cache.sh >> /var/log/pokemon-cache.log 2>&1
# Windows Task Scheduler equivalent: run "pnpm db:update-pokemon" monthly.
#
# Pokemon Champions note: this script caches all canonical Pokemon from PokeAPI.
# When Pokemon Champions (Switch 2) publishes a version-group filter via PokeAPI,
# update fetchAllNames() in seed-pokemon-cache.ts to use:
#   /api/v2/pokemon?version-group=champions&limit=10000
# ─────────────────────────────

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Starting Pokemon cache update…"
pnpm db:update-pokemon
echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Cache update complete."
```

- [ ] **Step 2: Make it executable**

```bash
chmod +x scripts/update-pokemon-cache.sh
```

- [ ] **Step 3: Dry-run to confirm it exits cleanly**

```bash
bash scripts/update-pokemon-cache.sh
```

Expected: completes with "Cache update complete." (may be fast since all Pokemon are already upserted).

- [ ] **Step 4: Commit**

```bash
git add scripts/update-pokemon-cache.sh package.json
git commit -m "feat(scripts): add monthly Pokemon cache refresh shell script with cron example"
```

---

## Task 4 — DX-14: tRPC router — serve from DB cache

**Files:**
- Modify: `src/server/api/routers/pokemon.ts`

- [ ] **Step 1: Replace the router file content**

Replace all of `src/server/api/routers/pokemon.ts` with:

```typescript
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { fetchPokemon, fetchMove, fetchAllPokemonNames } from "~/lib/pokeapi";
import { type PokemonSummary, type PokemonType } from "~/lib/types";
import { type CachedPokemon } from "../../../generated/prisma/index.js";

function dbToSummary(p: CachedPokemon): PokemonSummary {
  return {
    pokeApiId: p.id,
    name: p.name,
    sprite: p.sprite,
    types: p.types as PokemonType[],
    baseStats: {
      hp: p.hp,
      attack: p.attack,
      defense: p.defense,
      spAttack: p.spAttack,
      spDefense: p.spDefense,
      speed: p.speed,
    },
    moveNames: p.moveNames,
  };
}

export const pokemonRouter = createTRPCRouter({
  // Returns all Pokemon names ordered by PokeAPI id.
  // Reads from DB cache; falls back to PokeAPI if cache is empty.
  listNames: publicProcedure.query(async ({ ctx }) => {
    const count = await ctx.db.cachedPokemon.count();
    if (count === 0) return fetchAllPokemonNames();
    const rows = await ctx.db.cachedPokemon.findMany({
      select: { name: true },
      orderBy: { id: "asc" },
    });
    return rows.map((r) => r.name);
  }),

  // Returns { name, types } for every cached Pokemon — used by the type-filter picker.
  // Returns [] if cache is empty (picker falls back gracefully).
  listSummaries: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.cachedPokemon.findMany({
      select: { name: true, types: true },
      orderBy: { id: "asc" },
    });
  }),

  // Fetch a single Pokemon. Checks DB cache first, then PokeAPI.
  search: publicProcedure
    .input(z.object({ query: z.string().min(1).max(100) }))
    .query(async ({ input, ctx }) => {
      const q = input.query.toLowerCase().trim();
      const cached = await ctx.db.cachedPokemon.findFirst({ where: { name: q } });
      if (cached) return dbToSummary(cached);
      try {
        return await fetchPokemon(q);
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

- [ ] **Step 2: Typecheck**

```bash
pnpm typecheck
```

Expected: exits 0.

- [ ] **Step 3: Start dev server and verify the calculator loads Pokemon names**

```bash
pnpm dev
```

Navigate to `http://localhost:3000/calculator`. Open the attacker picker and search "char" — you should see Charizard etc. appear from the DB, not PokeAPI.

- [ ] **Step 4: Commit**

```bash
git add src/server/api/routers/pokemon.ts
git commit -m "feat(trpc): serve listNames, listSummaries, and search from DB cache with PokeAPI fallback"
```

---

## Task 5 — DX-15: Calculator two-column grid layout

**Files:**
- Modify: `src/app/calculator/page.tsx`
- Modify: `src/app/calculator/_components/DamageCalculator.tsx`

- [ ] **Step 1: Widen the page container**

In `src/app/calculator/page.tsx`, change `max-w-2xl` to `max-w-2xl lg:max-w-5xl`:

```tsx
import { api, HydrateClient } from "~/trpc/server";
import { DamageCalculator } from "./_components/DamageCalculator";

export default async function CalculatorPage() {
  void api.pokemon.listNames.prefetch();
  return (
    <HydrateClient>
      <div className="flex flex-col items-center">
        <div className="w-full max-w-2xl lg:max-w-5xl">
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

- [ ] **Step 2: Restructure DamageCalculator into a two-column grid**

Replace the `return (` block in `src/app/calculator/_components/DamageCalculator.tsx` (lines 170–301) with:

```tsx
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(280px,1fr)_minmax(0,1.4fr)] lg:items-start lg:gap-6">

      {/* ── LEFT COLUMN: random toggle + Pokemon pickers ── */}
      <div className="flex flex-col gap-4">

        {/* Random battle toggle */}
        <div className="flex items-center justify-between rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-4 py-3">
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
                className="rounded-lg border border-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-500 transition hover:border-violet-700 hover:text-violet-400 disabled:opacity-40"
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
              className={`relative h-6 w-11 rounded-full transition-colors duration-200 ${
                randomEnabled ? "bg-violet-600" : "bg-zinc-800"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                  randomEnabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Pokemon pickers */}
        <div className="relative grid grid-cols-2 gap-3">
          <PokemonSlotCard
            label="Attacker"
            value={attacker}
            onOpenPicker={() => setAttackerModalOpen(true)}
          />
          <div className="pointer-events-none absolute top-1/2 left-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-700 bg-zinc-950 text-xs font-black tracking-tight text-zinc-500 shadow-lg">
              vs
            </div>
          </div>
          <PokemonSlotCard
            label="Defender"
            value={defender}
            onOpenPicker={() => setDefenderModalOpen(true)}
          />
        </div>

      </div>

      {/* ── RIGHT COLUMN: move + config + calculate + result ── */}
      <div className="flex flex-col gap-4">

        {/* Move section */}
        <div className="flex flex-col gap-2 rounded-2xl border border-zinc-800/60 bg-zinc-900/30 p-4">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-zinc-600">Move</span>
          <MoveFuzzySearch
            moveNames={attacker?.moveNames ?? []}
            value={move}
            onSelect={m => { setMove(m); setResult(null); }}
            onClear={() => { setMove(null); setResult(null); }}
            inputRef={moveInputRef}
          />
        </div>

        {/* Battle config */}
        <BattleConfigPanel
          config={battleConfig}
          onChange={c => { setBattleConfig(c); setResult(null); }}
        />

        {/* Calculate */}
        <button
          type="button"
          onClick={calculate}
          disabled={!attacker || !defender || !move}
          className="w-full rounded-xl bg-violet-600 py-3 font-semibold text-white shadow-lg shadow-violet-900/30 transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
        >
          Calculate Damage
          <span className="ml-2 text-xs font-normal opacity-50">↵ Enter</span>
        </button>

        {/* Hotkey legend */}
        <div className="flex justify-center gap-6 text-xs text-zinc-700">
          <span><kbd className="rounded bg-zinc-900 px-1.5 py-0.5 font-mono text-zinc-600">↵</kbd> Calculate</span>
          <span><kbd className="rounded bg-zinc-900 px-1.5 py-0.5 font-mono text-zinc-600">Ctrl K</kbd> Focus search</span>
          <span><kbd className="rounded bg-zinc-900 px-1.5 py-0.5 font-mono text-zinc-600">↺</kbd> Reroll</span>
        </div>

        {/* Result */}
        {result && attacker && defender && (
          <DamageResultCard
            result={result.dmg}
            moveName={result.move.name}
            attackerName={attacker.name}
            defenderName={defender.name}
            defenderBaseHp={defender.baseStats.hp}
          />
        )}

      </div>

      {/* Modals */}
      {attackerModalOpen && (
        <PokemonPickerModal
          label="Attacker"
          current={attacker}
          onSelect={p => { setAttacker(p); setMove(null); setResult(null); setAttackerModalOpen(false); }}
          onClose={() => setAttackerModalOpen(false)}
        />
      )}
      {defenderModalOpen && (
        <PokemonPickerModal
          label="Defender"
          current={defender}
          onSelect={p => { setDefender(p); setResult(null); setDefenderModalOpen(false); }}
          onClose={() => setDefenderModalOpen(false)}
        />
      )}
    </div>
  );
```

- [ ] **Step 3: Typecheck**

```bash
pnpm typecheck
```

Expected: exits 0.

- [ ] **Step 4: Visual check at lg breakpoint**

Navigate to `http://localhost:3000/calculator`. Expand browser to ≥ 1024px. Confirm: pickers on left, move/config/result on right, no vertical scroll needed on a typical 1080p screen. Shrink to mobile — confirms single column.

- [ ] **Step 5: Commit**

```bash
git add src/app/calculator/page.tsx src/app/calculator/_components/DamageCalculator.tsx
git commit -m "feat(ui): two-column grid layout for calculator on large screens"
```

---

## Task 6 — DX-16: `TypeFilterBar` component

**Files:**
- Create: `src/app/calculator/_components/TypeFilterBar.tsx`

- [ ] **Step 1: Create the file**

Create `src/app/calculator/_components/TypeFilterBar.tsx`:

```tsx
"use client";

import { type PokemonType } from "~/lib/types";

export const ALL_TYPES: PokemonType[] = [
  "normal", "fire", "water", "electric", "grass",
  "ice", "fighting", "poison", "ground", "flying",
  "psychic", "bug", "rock", "ghost", "dragon",
  "dark", "steel", "fairy",
];

// Keys 1–0 map to the first 10 types in ALL_TYPES order.
export const HOTKEY_MAP: Record<string, PokemonType> = {
  "1": "normal", "2": "fire",     "3": "water",    "4": "electric", "5": "grass",
  "6": "ice",    "7": "fighting", "8": "poison",   "9": "ground",   "0": "flying",
};

const INACTIVE: Record<PokemonType, string> = {
  normal:   "border-[#A8A878]/40 text-[#A8A878] hover:bg-[#A8A878]/20",
  fire:     "border-[#F08030]/40 text-[#F08030] hover:bg-[#F08030]/20",
  water:    "border-[#6890F0]/40 text-[#6890F0] hover:bg-[#6890F0]/20",
  electric: "border-[#F8D030]/40 text-[#F8D030] hover:bg-[#F8D030]/20",
  grass:    "border-[#78C850]/40 text-[#78C850] hover:bg-[#78C850]/20",
  ice:      "border-[#98D8D8]/40 text-[#98D8D8] hover:bg-[#98D8D8]/20",
  fighting: "border-[#C03028]/40 text-[#C03028] hover:bg-[#C03028]/20",
  poison:   "border-[#A040A0]/40 text-[#A040A0] hover:bg-[#A040A0]/20",
  ground:   "border-[#E0C068]/40 text-[#E0C068] hover:bg-[#E0C068]/20",
  flying:   "border-[#A890F0]/40 text-[#A890F0] hover:bg-[#A890F0]/20",
  psychic:  "border-[#F85888]/40 text-[#F85888] hover:bg-[#F85888]/20",
  bug:      "border-[#A8B820]/40 text-[#A8B820] hover:bg-[#A8B820]/20",
  rock:     "border-[#B8A038]/40 text-[#B8A038] hover:bg-[#B8A038]/20",
  ghost:    "border-[#705898]/40 text-[#705898] hover:bg-[#705898]/20",
  dragon:   "border-[#7038F8]/40 text-[#7038F8] hover:bg-[#7038F8]/20",
  dark:     "border-[#705848]/40 text-[#705848] hover:bg-[#705848]/20",
  steel:    "border-[#B8B8D0]/40 text-[#B8B8D0] hover:bg-[#B8B8D0]/20",
  fairy:    "border-[#EE99AC]/40 text-[#EE99AC] hover:bg-[#EE99AC]/20",
};

const ACTIVE: Record<PokemonType, string> = {
  normal:   "bg-[#A8A878]/50 border-[#A8A878] text-white",
  fire:     "bg-[#F08030]/50 border-[#F08030] text-white",
  water:    "bg-[#6890F0]/50 border-[#6890F0] text-white",
  electric: "bg-[#F8D030]/50 border-[#F8D030] text-zinc-900",
  grass:    "bg-[#78C850]/50 border-[#78C850] text-white",
  ice:      "bg-[#98D8D8]/50 border-[#98D8D8] text-zinc-900",
  fighting: "bg-[#C03028]/50 border-[#C03028] text-white",
  poison:   "bg-[#A040A0]/50 border-[#A040A0] text-white",
  ground:   "bg-[#E0C068]/50 border-[#E0C068] text-zinc-900",
  flying:   "bg-[#A890F0]/50 border-[#A890F0] text-white",
  psychic:  "bg-[#F85888]/50 border-[#F85888] text-white",
  bug:      "bg-[#A8B820]/50 border-[#A8B820] text-white",
  rock:     "bg-[#B8A038]/50 border-[#B8A038] text-white",
  ghost:    "bg-[#705898]/50 border-[#705898] text-white",
  dragon:   "bg-[#7038F8]/50 border-[#7038F8] text-white",
  dark:     "bg-[#705848]/50 border-[#705848] text-white",
  steel:    "bg-[#B8B8D0]/50 border-[#B8B8D0] text-zinc-900",
  fairy:    "bg-[#EE99AC]/50 border-[#EE99AC] text-white",
};

interface TypeFilterBarProps {
  selected: PokemonType[];
  onChange: (types: PokemonType[]) => void;
}

export function TypeFilterBar({ selected, onChange }: TypeFilterBarProps) {
  function toggle(type: PokemonType) {
    onChange(
      selected.includes(type) ? selected.filter((t) => t !== type) : [...selected, type],
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
          Type filter
          {selected.length > 0 && (
            <span className="ml-1 text-violet-400">({selected.length} active)</span>
          )}
        </span>
        {selected.length > 0 && (
          <button
            onClick={() => onChange([])}
            className="text-[10px] text-zinc-600 transition hover:text-zinc-400"
          >
            Clear all
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {ALL_TYPES.map((type, i) => {
          const isActive = selected.includes(type);
          const hotkey = i < 9 ? String(i + 1) : i === 9 ? "0" : undefined;
          return (
            <button
              key={type}
              onClick={() => toggle(type)}
              title={hotkey ? `Hotkey: ${hotkey} (when text input is not focused)` : undefined}
              className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold capitalize transition ${
                isActive ? ACTIVE[type] : INACTIVE[type]
              }`}
            >
              {type}
              {hotkey && (
                <span className="font-mono text-[9px] opacity-40">{hotkey}</span>
              )}
            </button>
          );
        })}
      </div>
      {selected.length > 0 && (
        <p className="text-[10px] text-zinc-700">
          Showing Pokemon with{" "}
          <span className="text-zinc-500">{selected.map((t) => t).join(" + ")}</span>
          {selected.length > 1 ? " (dual-type match)" : ""}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm typecheck
```

Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add src/app/calculator/_components/TypeFilterBar.tsx
git commit -m "feat(ui): TypeFilterBar component with type pills and digit hotkey hints"
```

---

## Task 7 — DX-17: `PokemonPickerModal` type filter integration + hotkeys

**Files:**
- Modify: `src/app/calculator/_components/PokemonPickerModal.tsx`

This task depends on DX-14 (`listSummaries` procedure) and DX-16 (`TypeFilterBar`).

- [ ] **Step 1: Replace the file content**

Replace all of `src/app/calculator/_components/PokemonPickerModal.tsx` with:

```tsx
"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Image from "next/image";
import { api } from "~/trpc/react";
import { TypeBadge } from "~/app/_components/TypeBadge";
import { StatBar } from "~/app/_components/StatBar";
import { TypeFilterBar, HOTKEY_MAP } from "./TypeFilterBar";
import { type PokemonSummary, type PokemonType } from "~/lib/types";

interface PokemonPickerModalProps {
  label: string;
  current: PokemonSummary | null;
  onSelect: (p: PokemonSummary) => void;
  onClose: () => void;
}

export function PokemonPickerModal({ label, current, onSelect, onClose }: PokemonPickerModalProps) {
  const [query, setQuery] = useState("");
  const [chosen, setChosen] = useState<string | null>(null);
  const [typeFilters, setTypeFilters] = useState<PokemonType[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // listSummaries returns { name, types }[] — richer than listNames for filtering.
  const { data: allSummaries = [] } = api.pokemon.listSummaries.useQuery(undefined, {
    staleTime: Infinity,
  });

  const { data: pokemon, isFetching, error } = api.pokemon.search.useQuery(
    { query: chosen ?? "" },
    { enabled: !!chosen, retry: false },
  );

  const matches = useMemo(() => {
    const hasQuery = query.length >= 2;
    const hasFilter = typeFilters.length > 0;
    if (!hasQuery && !hasFilter) return [];

    const q = query.toLowerCase().replace(/\s/g, "-");
    return allSummaries
      .filter((s) => {
        const nameMatch = !hasQuery || s.name.includes(q);
        // AND logic: Pokemon must have ALL selected types (supports dual-type search)
        const typeMatch =
          !hasFilter || typeFilters.every((f) => s.types.includes(f));
        return nameMatch && typeMatch;
      })
      .slice(0, 20)
      .map((s) => s.name);
  }, [query, allSummaries, typeFilters]);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      // Digit hotkeys toggle type filters when text input is NOT focused
      const activeEl = document.activeElement;
      const isInInput =
        activeEl === inputRef.current ||
        activeEl?.tagName === "INPUT" ||
        activeEl?.tagName === "TEXTAREA";
      if (!isInInput && HOTKEY_MAP[e.key]) {
        e.preventDefault();
        const type = HOTKEY_MAP[e.key]!;
        setTypeFilters((prev) =>
          prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
        );
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function pick(name: string) {
    setChosen(name);
    setQuery(name.replace(/-/g, " "));
  }

  function reset() {
    setChosen(null);
    setQuery("");
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="animate-fade-in relative w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-950 p-5 shadow-2xl">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
            Select {label}
          </span>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-zinc-800 hover:text-zinc-200"
            aria-label="Close"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Search input */}
        <div className="relative">
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setChosen(null); }}
            placeholder="Charizard, Garchomp, 006…"
            className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-white placeholder-zinc-500 outline-none transition focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30"
          />
          {matches.length > 0 && !chosen && (
            <ul className="absolute top-full z-10 mt-1 max-h-52 w-full overflow-y-auto rounded-xl border border-zinc-700 bg-zinc-900 py-1 shadow-2xl">
              {matches.map((name) => (
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

        {/* Type filter bar */}
        <div className="mt-3">
          <TypeFilterBar selected={typeFilters} onChange={setTypeFilters} />
        </div>

        {/* Loading */}
        {isFetching && (
          <div className="relative mt-4 flex h-28 items-center justify-center overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
            <div className="absolute inset-0 bg-zinc-900/70 backdrop-blur-[1px]" />
            <div className="shimmer absolute inset-0" />
            <span className="relative z-10 text-xs text-zinc-600">Loading…</span>
          </div>
        )}

        {/* Error */}
        {error && <p className="mt-3 text-xs text-red-400">{error.message}</p>}

        {/* Result card */}
        {pokemon && chosen && !isFetching && (
          <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <div className="flex items-start gap-4">
              <div className="flex h-[88px] w-[88px] shrink-0 items-center justify-center rounded-xl bg-zinc-800/80">
                <Image
                  src={pokemon.sprite}
                  alt={pokemon.name}
                  width={80}
                  height={80}
                  unoptimized
                  className="drop-shadow-lg"
                />
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="flex items-center gap-2">
                  <h3 className="truncate font-bold capitalize tracking-tight text-white">
                    {pokemon.name}
                  </h3>
                  <span className="shrink-0 text-xs text-zinc-500">
                    #{String(pokemon.pokeApiId).padStart(3, "0")}
                  </span>
                </div>
                <div className="flex gap-1">
                  {pokemon.types.map((t) => (
                    <TypeBadge key={t} type={t as PokemonType} size="sm" />
                  ))}
                </div>
                <div className="flex flex-col gap-0.5 pt-0.5">
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
                onClick={() => { onSelect(pokemon); onClose(); }}
                className="flex-1 rounded-xl bg-violet-600 py-2 text-sm font-semibold text-white transition hover:bg-violet-500"
              >
                Use as {label}
              </button>
              <button
                onClick={reset}
                className="rounded-xl border border-zinc-700 px-3 py-2 text-sm text-zinc-400 transition hover:border-zinc-600 hover:text-white"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {/* Empty state when type filters active but no results */}
        {!pokemon && !isFetching && !chosen && matches.length === 0 && typeFilters.length > 0 && query.length < 2 && (
          <p className="mt-4 text-center text-xs text-zinc-600">
            No Pokemon match{" "}
            <span className="capitalize text-zinc-500">{typeFilters.join(" + ")}</span>.
            Try fewer filters.
          </p>
        )}

        {/* Keep-current hint */}
        {current && !pokemon && (
          <p className="mt-3 text-center text-xs text-zinc-600">
            Press <kbd className="rounded bg-zinc-800 px-1 py-0.5 font-mono text-[10px] text-zinc-500">Esc</kbd> or
            click outside to keep{" "}
            <span className="capitalize text-zinc-500">{current.name}</span>
          </p>
        )}

        {/* Hotkey hint */}
        <p className="mt-2 text-center text-[10px] text-zinc-700">
          Digits <kbd className="rounded bg-zinc-900 px-0.5 font-mono text-zinc-600">1</kbd>–
          <kbd className="rounded bg-zinc-900 px-0.5 font-mono text-zinc-600">0</kbd> toggle
          first 10 types (when not typing)
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm typecheck
```

Expected: exits 0.

- [ ] **Step 3: Manual test**

1. Open calculator → click Attacker picker.
2. Click the "Fire" type pill → list narrows to Fire-type Pokemon.
3. Also click "Flying" → list narrows to Fire/Flying dual-types (Charizard, Moltres, etc.).
4. Press `Esc` to clear focus from the text input, then press `3` — Water type should toggle.
5. Click "Clear all" → full list restores.

- [ ] **Step 4: Commit**

```bash
git add src/app/calculator/_components/PokemonPickerModal.tsx
git commit -m "feat(ui): type-filter bar with AND dual-type search and digit hotkeys in Pokemon picker"
```

---

## Task 8 — DX-18: `GlassLoader` + `SkeletonBlock` components

**Files:**
- Modify: `src/styles/globals.css`
- Create: `src/app/_components/GlassLoader.tsx`
- Create: `src/app/_components/SkeletonBlock.tsx`

- [ ] **Step 1: Add shimmer keyframe to `globals.css`**

In `src/styles/globals.css`, append inside the `@layer utilities` block (after the existing `animate-scale-in` keyframe):

```css
  .shimmer {
    background: linear-gradient(
      90deg,
      transparent     0%,
      rgb(255 255 255 / 0.05) 50%,
      transparent    100%
    );
    background-size: 200% 100%;
    animation: shimmer 1.4s ease-in-out infinite;
  }

  @keyframes shimmer {
    0%   { background-position: -200% 0; }
    100% { background-position:  200% 0; }
  }
```

- [ ] **Step 2: Create `GlassLoader`**

Create `src/app/_components/GlassLoader.tsx`:

```tsx
interface GlassLoaderProps {
  className?: string;
}

export function GlassLoader({ className }: GlassLoaderProps) {
  return (
    <div
      aria-hidden
      className={`absolute inset-0 z-10 overflow-hidden rounded-[inherit] ${className ?? ""}`}
    >
      <div className="absolute inset-0 bg-zinc-900/60 backdrop-blur-[2px]" />
      <div className="shimmer absolute inset-0" />
    </div>
  );
}
```

- [ ] **Step 3: Create `SkeletonBlock`**

Create `src/app/_components/SkeletonBlock.tsx`:

```tsx
interface SkeletonBlockProps {
  className?: string;
}

export function SkeletonBlock({ className }: SkeletonBlockProps) {
  return (
    <div
      aria-hidden
      className={`relative overflow-hidden rounded-lg bg-zinc-800/50 ${className ?? ""}`}
    >
      <div className="shimmer absolute inset-0" />
    </div>
  );
}
```

- [ ] **Step 4: Typecheck**

```bash
pnpm typecheck
```

Expected: exits 0.

- [ ] **Step 5: Commit**

```bash
git add src/styles/globals.css src/app/_components/GlassLoader.tsx src/app/_components/SkeletonBlock.tsx
git commit -m "feat(ui): GlassLoader shimmer overlay + SkeletonBlock for loading states"
```

---

## Task 9 — DX-19: Apply loading states across the calculator

**Files:**
- Modify: `src/app/calculator/_components/DamageCalculator.tsx`
- Modify: `src/app/calculator/_components/MoveFuzzySearch.tsx`

- [ ] **Step 1: Add import and loading overlay to `DamageCalculator`**

In `src/app/calculator/_components/DamageCalculator.tsx`, add the `GlassLoader` import:

```tsx
import { GlassLoader } from "~/app/_components/GlassLoader";
```

Then update the `allNames` query to also capture `isLoading`:

```tsx
const { data: allNames = [], isLoading: namesLoading } = api.pokemon.listNames.useQuery(
  undefined,
  { staleTime: Infinity },
);
```

Wrap the random battle toggle section with a relative container so the loader can overlay it:

```tsx
{/* Random battle toggle */}
<div className="relative flex items-center justify-between rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-4 py-3">
  {namesLoading && <GlassLoader />}
  {/* ... rest of toggle content unchanged ... */}
</div>
```

Also add a `[isRandomizing, setIsRandomizing]` state to show loading while `randomizeBattle()` runs:

```tsx
const [isRandomizing, setIsRandomizing] = useState(false);
```

Update `randomizeBattle` to set this flag:

```tsx
const randomizeBattle = useCallback(async () => {
  if (allNames.length === 0) return;
  setIsRandomizing(true);
  // ... existing code ...
  setIsRandomizing(false);
}, [allNames, utils]);
```

Then wrap the Pokemon pickers div:

```tsx
{/* Pokemon pickers */}
<div className="relative grid grid-cols-2 gap-3">
  {isRandomizing && <GlassLoader className="rounded-2xl" />}
  {/* ... existing picker cards ... */}
</div>
```

- [ ] **Step 2: Read `MoveFuzzySearch.tsx` to understand its structure**

Read `src/app/calculator/_components/MoveFuzzySearch.tsx`. Identify where move fetching happens and add a shimmer to the dropdown area while `isFetching` is true.

The component fetches move data via `api.pokemon.getMove.useQuery`. When `isFetching`, show a skeleton row in the dropdown:

```tsx
import { SkeletonBlock } from "~/app/_components/SkeletonBlock";

// Inside the dropdown, below the match list or instead of it:
{isFetching && (
  <div className="px-3 py-2">
    <SkeletonBlock className="h-5 w-3/4" />
  </div>
)}
```

- [ ] **Step 3: Typecheck**

```bash
pnpm typecheck
```

Expected: exits 0.

- [ ] **Step 4: Visual test**

With the dev server running, clear sessionStorage and refresh the calculator. The random battle toggle should briefly show a shimmer while names load. Open the attacker picker and select a Pokemon — the move list area should briefly shimmer while move data loads.

- [ ] **Step 5: Commit**

```bash
git add src/app/calculator/_components/DamageCalculator.tsx src/app/calculator/_components/MoveFuzzySearch.tsx
git commit -m "feat(ui): shimmer loading overlays on random battle toggle, pickers, and move search"
```

---

## Task 10 — DX-20: UI polish — background + component styling

**Files:**
- Modify: `src/styles/globals.css`
- Modify: `src/app/calculator/_components/DamageCalculator.tsx` (PokemonSlotCard type glow)
- Modify: `src/app/calculator/_components/DamageResult.tsx` (move-type accent border)

- [ ] **Step 1: Upgrade the background in `globals.css`**

Replace the existing `@layer base` body rule in `src/styles/globals.css`:

```css
@layer base {
  body {
    @apply bg-zinc-900 text-zinc-100 antialiased;
    background-image:
      radial-gradient(ellipse 80% 55% at 50% -5%,  rgb(109 40 217 / 0.30) 0%, transparent 65%),
      radial-gradient(ellipse 45% 35% at 92% 85%,  rgb(16 185 129 / 0.10) 0%, transparent 60%),
      radial-gradient(ellipse 40% 25% at 8%  90%,  rgb(245 158 11 / 0.07) 0%, transparent 55%);
    background-attachment: fixed;
  }
}
```

- [ ] **Step 2: Add a `glass-card` component utility**

Inside `@layer utilities` in `globals.css`, add (just before the closing `}`):

```css
  .glass-card {
    border-radius: theme(borderRadius.2xl);
    border: 1px solid rgb(63 63 70 / 0.5);
    background-color: rgb(39 39 42 / 0.3);
    backdrop-filter: blur(4px);
  }
```

- [ ] **Step 3: Apply type-coloured hover glow to `PokemonSlotCard`**

In `src/app/calculator/_components/DamageCalculator.tsx`, update `PokemonSlotCard` to add an inline glow when a Pokemon is selected. Replace the inner `div` with the `role="button"`:

```tsx
<div
  role="button"
  tabIndex={0}
  onClick={onOpenPicker}
  onKeyDown={e => { if (e.key === "Enter" || e.key === " ") onOpenPicker(); }}
  style={value?.types[0]
    ? { ["--type-glow" as string]: `var(--color-type-${value.types[0]})` }
    : undefined}
  className="group relative flex cursor-pointer flex-col items-center gap-2 rounded-2xl border border-zinc-700/50 bg-zinc-800/30 p-4 backdrop-blur-sm transition hover:border-[var(--type-glow,theme(colors.zinc.600))] hover:shadow-[0_0_20px_var(--type-glow,transparent)/20]"
>
```

- [ ] **Step 4: Add move-type accent border to `DamageResult.tsx`**

In `src/app/calculator/_components/DamageResult.tsx`, accept `moveType` as an optional prop and apply it as a subtle top border accent. Update the interface and outer div:

```tsx
interface DamageResultCardProps {
  result: DamageResult;
  moveName: string;
  moveType?: string;      // optional — used for accent colour
  attackerName: string;
  defenderName: string;
  defenderBaseHp: number;
}

export function DamageResultCard({
  result, moveName, moveType, attackerName, defenderName, defenderBaseHp,
}: DamageResultCardProps) {
  // ...existing logic...
  return (
    <div
      style={moveType ? { borderTopColor: `var(--color-type-${moveType})` } : undefined}
      className="animate-fade-in flex flex-col gap-5 rounded-2xl border border-zinc-700/50 bg-zinc-800/30 p-6 backdrop-blur-sm"
    >
      {/* border-t accent */}
      {moveType && (
        <div
          className="absolute inset-x-0 top-0 h-px rounded-t-2xl opacity-60"
          style={{ background: `var(--color-type-${moveType})` }}
        />
      )}
      {/* ...rest of component unchanged... */}
    </div>
  );
}
```

Then in `DamageCalculator.tsx`, pass `moveType`:

```tsx
<DamageResultCard
  result={result.dmg}
  moveName={result.move.name}
  moveType={result.move.type}
  attackerName={attacker.name}
  defenderName={defender.name}
  defenderBaseHp={defender.baseStats.hp}
/>
```

- [ ] **Step 5: Apply `glass-card` class to main calculator panels**

In `DamageCalculator.tsx`, replace the panel `className` strings:

| Old class string | New class string |
|-----------------|-----------------|
| `"rounded-2xl border border-zinc-800/60 bg-zinc-900/30 p-4"` (Move section) | `"glass-card p-4"` |
| `"rounded-2xl border border-zinc-800/80 bg-zinc-900/40 px-4 py-3"` (Random toggle) | `"glass-card px-4 py-3"` |

In `BattleConfigPanel.tsx`, change:

```tsx
<div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/30 p-4">
```
to:
```tsx
<div className="glass-card p-4">
```

- [ ] **Step 6: Update the empty slot button style**

In `PokemonSlotCard` in `DamageCalculator.tsx`, update the empty slot button:

```tsx
<button
  onClick={onOpenPicker}
  className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-zinc-700/60 bg-zinc-800/20 py-5 backdrop-blur-sm transition hover:border-violet-500/60 hover:bg-violet-900/10"
>
```

- [ ] **Step 7: Typecheck**

```bash
pnpm typecheck
```

Expected: exits 0.

- [ ] **Step 8: Format**

```bash
pnpm format:write
```

- [ ] **Step 9: Visual check**

View `http://localhost:3000/calculator` at both mobile (375px) and desktop (1280px). Confirm:
- Background has visible multi-gradient depth (purple top, teal and amber corner hints)
- Cards have subtle frosted glass appearance
- Attacker/Defender hover glow colour matches their Pokemon's type
- Result card has a thin type-coloured top accent border
- All text remains legible

- [ ] **Step 10: Commit**

```bash
git add src/styles/globals.css src/app/calculator/_components/DamageCalculator.tsx src/app/calculator/_components/DamageResult.tsx src/app/calculator/_components/BattleConfigPanel.tsx
git commit -m "feat(ui): multi-gradient background, glass-card panels, type glow on pickers, move-type accent on result"
```

---

## Self-Review

### Spec Coverage

| Requirement | Task |
|-------------|------|
| Cache all Pokemon | DX-11, DX-12 |
| Monthly update script | DX-13 |
| Calculator grid layout | DX-15 |
| Mobile single column preserved | DX-15 (mobile-first, grid only at lg) |
| Type filter (primary + secondary) | DX-16, DX-17 |
| Dual-type AND filter logic | DX-17 (`.every()` check) |
| Type filter hotkeys | DX-17 (digit keys 1–0) |
| Loading states / shimmer | DX-18, DX-19 |
| Brighter background | DX-20 (zinc-900 base + stronger gradients) |
| More interesting background | DX-20 (3-gradient multi-corner radials) |
| Visual component polish | DX-20 (glass-card, type glow, accent border) |

All requirements covered. No placeholders.

### Type Consistency

- `dbToSummary(p: CachedPokemon): PokemonSummary` defined in DX-14; returns the exact `PokemonSummary` shape from `src/lib/types.ts`.
- `TypeFilterBar` accepts `PokemonType[]` — same type from `~/lib/types`.
- `HOTKEY_MAP` is `Record<string, PokemonType>` — digit key maps to `PokemonType` union.
- `listSummaries` returns `{ name: string; types: string[] }[]` — `.types` cast to `PokemonType[]` only at usage sites (matches existing pattern in codebase).
- `DamageResultCard` `moveType` prop is `string` (not `PokemonType`) to keep it optional without a union cast at the call site.
- `GlassLoader` and `SkeletonBlock` accept only `className?: string` — no internal state, pure presentational.
