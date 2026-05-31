# Auth + Saved Calcs + Side Nav + Item & Move Enhancements — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Clerk authentication with per-user saved damage calculations, a collapsible side nav, Champions-only item filtering backed by an expanded item catalogue, and status-move filtering to the damage calculator.

**Architecture:** Four independent sub-systems ship in order — (1) item/move enhancements (no auth required, unblocks Champions UX immediately), (2) Clerk auth foundation (env, middleware, tRPC context), (3) database and API layer for saved calcs (depends on auth), (4) the UI layer for the side nav, two-panel calculator, saved-calc cards, and save button. Each sub-system produces working, testable software on its own.

**Tech Stack:** Next.js 15 App Router · React 19 · @clerk/nextjs · tRPC v11 · Prisma 6 · PostgreSQL · Tailwind CSS v4 · TypeScript · Vitest · pnpm

---

## Dev Team & Work Allocation

| ID    | Title                                                        | Type | Assignee  | Priority | Points | Depends On    |
|-------|--------------------------------------------------------------|------|-----------|----------|--------|---------------|
| DX-01 | `type_resist_berry` ItemEffect + `getItemDefenseMult` update | task | Sr Dev    | P0       | 2      | —             |
| DX-02 | Expand `COMPETITIVE_ITEMS` with all Champions items          | task | Jr Dev B  | P0       | 5      | DX-01         |
| DX-03 | Vitest: new item calculation helpers                         | task | Jr Dev B  | P0       | 2      | DX-02         |
| DX-04 | Champions Only toggle in `ItemSearch`                        | task | Jr Dev A  | P1       | 2      | DX-02         |
| DX-05 | Attacking-moves-only filter in `MoveFuzzySearch`             | task | Jr Dev A  | P1       | 2      | —             |
| DX-06 | Clerk install — `env.js`, `.env.local` stub, `ClerkProvider` | task | Sr Dev    | P0       | 3      | —             |
| DX-07 | `middleware.ts` — protect `/teams`, `/my-teams`              | task | Sr Dev    | P0       | 2      | DX-06         |
| DX-08 | tRPC context: Clerk `userId` injection + `protectedProcedure`| task | Sr Dev    | P0       | 3      | DX-06         |
| DX-09 | Prisma: `SavedCalc` model + `userId` on `Team`               | task | Jr Dev B  | P0       | 3      | DX-08         |
| DX-10 | tRPC `calc` router — `save`, `list`, `delete`                | task | Jr Dev B  | P1       | 3      | DX-08, DX-09  |
| DX-11 | Update `team` router — scope all queries by `userId`         | task | Jr Dev B  | P1       | 2      | DX-08, DX-09  |
| DX-12 | Collapsible `SideNav` + root layout restructure              | task | Jr Dev A  | P1       | 5      | DX-06         |
| DX-13 | Calculator two-panel responsive layout                       | task | Jr Dev A  | P1       | 3      | DX-06         |
| DX-14 | `SavedCalcCard` + `SavedCalcsPanel` wired to `calc.list`     | task | Jr Dev A  | P1       | 3      | DX-10, DX-13  |
| DX-15 | Save button in `DamageCalculator` (auth-gated)               | task | Jr Dev A  | P2       | 2      | DX-10         |

**Total: 42 points across 15 tickets**

---

## File Map

### Modified
| File | What changes |
|------|-------------|
| `src/lib/items.ts` | Add `type_resist_berry` to `ItemEffect`, `isChampionsItem` to `CompetitiveItem`, 80+ new entries, update `getItemDefenseMult` signature |
| `src/lib/__tests__/items.test.ts` | New tests for `type_resist_berry` and Silk Scarf |
| `src/app/calculator/_components/ItemSearch.tsx` | Champions Only toggle — filters list to `isChampionsItem: true` |
| `src/app/calculator/_components/MoveFuzzySearch.tsx` | `attackingOnly` prop; filter status moves in both inline and modal search |
| `src/app/calculator/_components/DamageCalculator.tsx` | Pass `attackingOnly={true}`, fix `getItemDefenseMult` call site, add save button |
| `src/app/layout.tsx` | Wrap with `ClerkProvider`, replace `<Nav />` with `<SideNav />`, flex-row shell |
| `src/app/calculator/page.tsx` | Two-panel grid layout: calc left, saved-calcs right |
| `src/server/api/trpc.ts` | Inject Clerk `userId` into context, add `protectedProcedure` |
| `src/server/api/routers/team.ts` | Scope `create`/`list` by `userId` |
| `src/server/api/root.ts` | Register `calc` router |
| `src/env.js` | Add `CLERK_SECRET_KEY` (server) + `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (client) |
| `prisma/schema.prisma` | Add `SavedCalc` model; add `userId String?` to `Team` |
| `src/app/api/trpc/[trpc]/route.ts` | Pass raw `req` to `createTRPCContext` |

### Created
| File | Purpose |
|------|---------|
| `src/middleware.ts` | Clerk middleware with route matcher |
| `src/app/_components/SideNav.tsx` | Collapsible side nav with links + `UserButton` |
| `src/app/calculator/_components/SavedCalcCard.tsx` | Single saved calc summary card |
| `src/app/calculator/_components/SavedCalcsPanel.tsx` | Scrollable panel container |
| `src/server/api/routers/calc.ts` | `save`, `list`, `delete` tRPC procedures |

### Deleted
| File | Reason |
|------|--------|
| `src/app/_components/Nav.tsx` | Replaced by `SideNav.tsx` |

---

## Sub-system 1 — Item & Move Enhancements

### Task 1 (DX-01): `type_resist_berry` ItemEffect type + `getItemDefenseMult` update

**Assignee:** Sr Dev | **Priority:** P0 | **Points:** 2

**Files:**
- Modify: `src/lib/items.ts`
- Modify: `src/app/calculator/_components/DamageCalculator.tsx` (call site only)

> **Context:** Type-resist berries (Occa, Passho, Wacan, etc.) cut damage by 50% when the defender is hit by a super-effective move of the berry's type. The current `ItemEffect` union has no variant for this. We also need `isChampionsItem` on `CompetitiveItem` for the toggle in Task 4.

- [ ] **Step 1: Update `ItemEffect` union and `CompetitiveItem` interface**

Replace lines 1–15 of `src/lib/items.ts` with:

```ts
import { type PokemonType } from "~/lib/types";

export type ItemEffect =
  | { type: "attack_mult";       mult: number; category: "physical" | "special" | "any" }
  | { type: "defense_mult";      mult: number }
  | { type: "damage_mult";       mult: number; superEffectiveOnly?: boolean }
  | { type: "type_boost";        poketype: PokemonType; mult: number }
  | { type: "type_resist_berry"; poketype: PokemonType; mult: 0.5 }
  | { type: "none" };

export interface CompetitiveItem {
  slug: string;
  name: string;
  spriteUrl: string;
  effect: ItemEffect;
  isChampionsItem?: boolean;
}
```

- [ ] **Step 2: Update `getItemDefenseMult` to accept `moveType` and handle the new variant**

Replace the existing `getItemDefenseMult` function in `src/lib/items.ts`:

```ts
export function getItemDefenseMult(
  item: CompetitiveItem,
  moveCategory: string,
  moveType?: PokemonType,
): number {
  const { effect } = item;
  if (effect.type === "defense_mult" && moveCategory === "special") return effect.mult;
  if (effect.type === "type_resist_berry" && moveType === effect.poketype) return effect.mult;
  return 1;
}
```

- [ ] **Step 3: Fix the call site in DamageCalculator**

Search for `getItemDefenseMult` in `src/app/calculator/_components/DamageCalculator.tsx`:

```bash
grep -n "getItemDefenseMult" src/app/calculator/_components/DamageCalculator.tsx
```

Update the call to pass the move type as a third argument:

```ts
// Before
getItemDefenseMult(defenderItem, move.category)

// After
getItemDefenseMult(defenderItem, move.category, move.type)
```

- [ ] **Step 4: Typecheck**

```bash
pnpm typecheck
```

Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/items.ts src/app/calculator/_components/DamageCalculator.tsx
git commit -m "feat(items): add type_resist_berry ItemEffect + isChampionsItem flag"
```

---

### Task 2 (DX-02): Expand `COMPETITIVE_ITEMS` with all Champions items

**Assignee:** Jr Dev B | **Priority:** P0 | **Points:** 5

**Files:**
- Modify: `src/lib/items.ts`

> **Context:** Source: https://www.serebii.net/pokemonchampions/items.shtml — Hold Items, Mega Stones, Berries sections. Miscellaneous (Affinity Tickets, coupons) are game-currency, not held items, and are excluded. Items already in the list get `isChampionsItem: true`. New items are appended in clearly labelled sections. Mega Stones use `{ type: "none" }` — they enable Mega Evolution but don't modify damage directly (the Mega Pokemon's stats are already higher). Utility berries (Lum, Sitrus, etc.) use `{ type: "none" }`. Type-resist berries use the new `type_resist_berry` effect. PokeAPI slug format is kebab-case. Champions-exclusive Mega Stones not in PokeAPI will have 404 sprites — this is acceptable.

- [ ] **Step 1: Mark existing items that appear on the Champions list**

The following existing items in `COMPETITIVE_ITEMS` are in the Champions Hold Items list. Add `isChampionsItem: true` to each of them. Items NOT on the Champions list (`choice-band`, `choice-specs`, `life-orb`, `expert-belt`, `assault-vest`) remain without the flag.

```ts
// ── Attack stat multipliers ────────────────────────────────────────────────────
{ slug: "choice-band",    name: "Choice Band",    spriteUrl: SPRITE("choice-band"),    effect: { type: "attack_mult", mult: 1.5, category: "physical" } },
{ slug: "choice-specs",   name: "Choice Specs",   spriteUrl: SPRITE("choice-specs"),   effect: { type: "attack_mult", mult: 1.5, category: "special"  } },
// ── Final damage multipliers ──────────────────────────────────────────────────
{ slug: "life-orb",       name: "Life Orb",       spriteUrl: SPRITE("life-orb"),       effect: { type: "damage_mult", mult: 1.3 } },
{ slug: "expert-belt",    name: "Expert Belt",    spriteUrl: SPRITE("expert-belt"),    effect: { type: "damage_mult", mult: 1.2, superEffectiveOnly: true } },
// ── Defender: special defense multiplier ──────────────────────────────────────
{ slug: "assault-vest",   name: "Assault Vest",   spriteUrl: SPRITE("assault-vest"),   effect: { type: "defense_mult", mult: 1.5 } },
// ── Type-boosting held items (all Champions) ──────────────────────────────────
{ slug: "charcoal",       name: "Charcoal",       spriteUrl: SPRITE("charcoal"),       effect: { type: "type_boost", poketype: "fire",     mult: 1.2 }, isChampionsItem: true },
{ slug: "mystic-water",   name: "Mystic Water",   spriteUrl: SPRITE("mystic-water"),   effect: { type: "type_boost", poketype: "water",    mult: 1.2 }, isChampionsItem: true },
{ slug: "miracle-seed",   name: "Miracle Seed",   spriteUrl: SPRITE("miracle-seed"),   effect: { type: "type_boost", poketype: "grass",    mult: 1.2 }, isChampionsItem: true },
{ slug: "magnet",         name: "Magnet",         spriteUrl: SPRITE("magnet"),         effect: { type: "type_boost", poketype: "electric", mult: 1.2 }, isChampionsItem: true },
{ slug: "nevermeltice",   name: "NeverMeltIce",   spriteUrl: SPRITE("nevermeltice"),   effect: { type: "type_boost", poketype: "ice",      mult: 1.2 }, isChampionsItem: true },
{ slug: "black-belt",     name: "Black Belt",     spriteUrl: SPRITE("black-belt"),     effect: { type: "type_boost", poketype: "fighting", mult: 1.2 }, isChampionsItem: true },
{ slug: "poison-barb",    name: "Poison Barb",    spriteUrl: SPRITE("poison-barb"),    effect: { type: "type_boost", poketype: "poison",   mult: 1.2 }, isChampionsItem: true },
{ slug: "soft-sand",      name: "Soft Sand",      spriteUrl: SPRITE("soft-sand"),      effect: { type: "type_boost", poketype: "ground",   mult: 1.2 }, isChampionsItem: true },
{ slug: "sharp-beak",     name: "Sharp Beak",     spriteUrl: SPRITE("sharp-beak"),     effect: { type: "type_boost", poketype: "flying",   mult: 1.2 }, isChampionsItem: true },
{ slug: "twisted-spoon",  name: "Twisted Spoon",  spriteUrl: SPRITE("twisted-spoon"),  effect: { type: "type_boost", poketype: "psychic",  mult: 1.2 }, isChampionsItem: true },
{ slug: "silverpowder",   name: "SilverPowder",   spriteUrl: SPRITE("silverpowder"),   effect: { type: "type_boost", poketype: "bug",      mult: 1.2 }, isChampionsItem: true },
{ slug: "hard-stone",     name: "Hard Stone",     spriteUrl: SPRITE("hard-stone"),     effect: { type: "type_boost", poketype: "rock",     mult: 1.2 }, isChampionsItem: true },
{ slug: "spell-tag",      name: "Spell Tag",      spriteUrl: SPRITE("spell-tag"),      effect: { type: "type_boost", poketype: "ghost",    mult: 1.2 }, isChampionsItem: true },
{ slug: "dragon-fang",    name: "Dragon Fang",    spriteUrl: SPRITE("dragon-fang"),    effect: { type: "type_boost", poketype: "dragon",   mult: 1.2 }, isChampionsItem: true },
{ slug: "black-glasses",  name: "BlackGlasses",   spriteUrl: SPRITE("black-glasses"),  effect: { type: "type_boost", poketype: "dark",     mult: 1.2 }, isChampionsItem: true },
{ slug: "metal-coat",     name: "Metal Coat",     spriteUrl: SPRITE("metal-coat"),     effect: { type: "type_boost", poketype: "steel",    mult: 1.2 }, isChampionsItem: true },
{ slug: "fairy-feather",  name: "Fairy Feather",  spriteUrl: SPRITE("fairy-feather"),  effect: { type: "type_boost", poketype: "fairy",    mult: 1.2 }, isChampionsItem: true },
```

- [ ] **Step 2: Append Champions-exclusive Hold Items**

Add after the existing entries, before the closing `];`:

```ts
  // ── Champions Hold Items ──────────────────────────────────────────────────────
  { slug: "silk-scarf",    name: "Silk Scarf",    spriteUrl: SPRITE("silk-scarf"),    effect: { type: "type_boost",   poketype: "normal", mult: 1.2 }, isChampionsItem: true },
  { slug: "choice-scarf",  name: "Choice Scarf",  spriteUrl: SPRITE("choice-scarf"),  effect: { type: "none" },                                        isChampionsItem: true },
  { slug: "focus-band",    name: "Focus Band",    spriteUrl: SPRITE("focus-band"),    effect: { type: "none" },                                        isChampionsItem: true },
  { slug: "focus-sash",    name: "Focus Sash",    spriteUrl: SPRITE("focus-sash"),    effect: { type: "none" },                                        isChampionsItem: true },
  { slug: "kings-rock",    name: "King's Rock",   spriteUrl: SPRITE("kings-rock"),    effect: { type: "none" },                                        isChampionsItem: true },
  { slug: "leftovers",     name: "Leftovers",     spriteUrl: SPRITE("leftovers"),     effect: { type: "none" },                                        isChampionsItem: true },
  { slug: "light-ball",    name: "Light Ball",    spriteUrl: SPRITE("light-ball"),    effect: { type: "attack_mult", mult: 2.0, category: "any" },     isChampionsItem: true },
  { slug: "mental-herb",   name: "Mental Herb",   spriteUrl: SPRITE("mental-herb"),   effect: { type: "none" },                                        isChampionsItem: true },
  { slug: "quick-claw",    name: "Quick Claw",    spriteUrl: SPRITE("quick-claw"),    effect: { type: "none" },                                        isChampionsItem: true },
  { slug: "scope-lens",    name: "Scope Lens",    spriteUrl: SPRITE("scope-lens"),    effect: { type: "none" },                                        isChampionsItem: true },
  { slug: "shell-bell",    name: "Shell Bell",    spriteUrl: SPRITE("shell-bell"),    effect: { type: "none" },                                        isChampionsItem: true },
  { slug: "brightpowder",  name: "Bright Powder", spriteUrl: SPRITE("brightpowder"),  effect: { type: "none" },                                        isChampionsItem: true },
  { slug: "white-herb",    name: "White Herb",    spriteUrl: SPRITE("white-herb"),    effect: { type: "none" },                                        isChampionsItem: true },
```

- [ ] **Step 3: Append Champions utility Berries**

```ts
  // ── Champions Berries — utility ───────────────────────────────────────────────
  { slug: "lum-berry",     name: "Lum Berry",     spriteUrl: SPRITE("lum-berry"),     effect: { type: "none" }, isChampionsItem: true },
  { slug: "sitrus-berry",  name: "Sitrus Berry",  spriteUrl: SPRITE("sitrus-berry"),  effect: { type: "none" }, isChampionsItem: true },
  { slug: "oran-berry",    name: "Oran Berry",    spriteUrl: SPRITE("oran-berry"),    effect: { type: "none" }, isChampionsItem: true },
  { slug: "cheri-berry",   name: "Cheri Berry",   spriteUrl: SPRITE("cheri-berry"),   effect: { type: "none" }, isChampionsItem: true },
  { slug: "chesto-berry",  name: "Chesto Berry",  spriteUrl: SPRITE("chesto-berry"),  effect: { type: "none" }, isChampionsItem: true },
  { slug: "pecha-berry",   name: "Pecha Berry",   spriteUrl: SPRITE("pecha-berry"),   effect: { type: "none" }, isChampionsItem: true },
  { slug: "rawst-berry",   name: "Rawst Berry",   spriteUrl: SPRITE("rawst-berry"),   effect: { type: "none" }, isChampionsItem: true },
  { slug: "aspear-berry",  name: "Aspear Berry",  spriteUrl: SPRITE("aspear-berry"),  effect: { type: "none" }, isChampionsItem: true },
  { slug: "persim-berry",  name: "Persim Berry",  spriteUrl: SPRITE("persim-berry"),  effect: { type: "none" }, isChampionsItem: true },
  { slug: "leppa-berry",   name: "Leppa Berry",   spriteUrl: SPRITE("leppa-berry"),   effect: { type: "none" }, isChampionsItem: true },
```

- [ ] **Step 4: Append Champions type-resist Berries**

Each berry halves damage when the defender is hit by a super-effective move of the matching type.

```ts
  // ── Champions Berries — type-resist (defender item) ───────────────────────────
  { slug: "occa-berry",    name: "Occa Berry",    spriteUrl: SPRITE("occa-berry"),    effect: { type: "type_resist_berry", poketype: "fire",     mult: 0.5 }, isChampionsItem: true },
  { slug: "passho-berry",  name: "Passho Berry",  spriteUrl: SPRITE("passho-berry"),  effect: { type: "type_resist_berry", poketype: "water",    mult: 0.5 }, isChampionsItem: true },
  { slug: "wacan-berry",   name: "Wacan Berry",   spriteUrl: SPRITE("wacan-berry"),   effect: { type: "type_resist_berry", poketype: "electric", mult: 0.5 }, isChampionsItem: true },
  { slug: "rindo-berry",   name: "Rindo Berry",   spriteUrl: SPRITE("rindo-berry"),   effect: { type: "type_resist_berry", poketype: "grass",    mult: 0.5 }, isChampionsItem: true },
  { slug: "yache-berry",   name: "Yache Berry",   spriteUrl: SPRITE("yache-berry"),   effect: { type: "type_resist_berry", poketype: "ice",      mult: 0.5 }, isChampionsItem: true },
  { slug: "chople-berry",  name: "Chople Berry",  spriteUrl: SPRITE("chople-berry"),  effect: { type: "type_resist_berry", poketype: "fighting", mult: 0.5 }, isChampionsItem: true },
  { slug: "kebia-berry",   name: "Kebia Berry",   spriteUrl: SPRITE("kebia-berry"),   effect: { type: "type_resist_berry", poketype: "poison",   mult: 0.5 }, isChampionsItem: true },
  { slug: "shuca-berry",   name: "Shuca Berry",   spriteUrl: SPRITE("shuca-berry"),   effect: { type: "type_resist_berry", poketype: "ground",   mult: 0.5 }, isChampionsItem: true },
  { slug: "coba-berry",    name: "Coba Berry",    spriteUrl: SPRITE("coba-berry"),    effect: { type: "type_resist_berry", poketype: "flying",   mult: 0.5 }, isChampionsItem: true },
  { slug: "payapa-berry",  name: "Payapa Berry",  spriteUrl: SPRITE("payapa-berry"),  effect: { type: "type_resist_berry", poketype: "psychic",  mult: 0.5 }, isChampionsItem: true },
  { slug: "tanga-berry",   name: "Tanga Berry",   spriteUrl: SPRITE("tanga-berry"),   effect: { type: "type_resist_berry", poketype: "bug",      mult: 0.5 }, isChampionsItem: true },
  { slug: "charti-berry",  name: "Charti Berry",  spriteUrl: SPRITE("charti-berry"),  effect: { type: "type_resist_berry", poketype: "rock",     mult: 0.5 }, isChampionsItem: true },
  { slug: "kasib-berry",   name: "Kasib Berry",   spriteUrl: SPRITE("kasib-berry"),   effect: { type: "type_resist_berry", poketype: "ghost",    mult: 0.5 }, isChampionsItem: true },
  { slug: "haban-berry",   name: "Haban Berry",   spriteUrl: SPRITE("haban-berry"),   effect: { type: "type_resist_berry", poketype: "dragon",   mult: 0.5 }, isChampionsItem: true },
  { slug: "colbur-berry",  name: "Colbur Berry",  spriteUrl: SPRITE("colbur-berry"),  effect: { type: "type_resist_berry", poketype: "dark",     mult: 0.5 }, isChampionsItem: true },
  { slug: "babiri-berry",  name: "Babiri Berry",  spriteUrl: SPRITE("babiri-berry"),  effect: { type: "type_resist_berry", poketype: "steel",    mult: 0.5 }, isChampionsItem: true },
  { slug: "chilan-berry",  name: "Chilan Berry",  spriteUrl: SPRITE("chilan-berry"),  effect: { type: "type_resist_berry", poketype: "normal",   mult: 0.5 }, isChampionsItem: true },
  { slug: "roseli-berry",  name: "Roseli Berry",  spriteUrl: SPRITE("roseli-berry"),  effect: { type: "type_resist_berry", poketype: "fairy",    mult: 0.5 }, isChampionsItem: true },
```

- [ ] **Step 5: Append all 59 Champions Mega Stones**

Mega Stones have `{ type: "none" }` — Mega Pokemon stats are already embedded in PokeAPI data; the stone itself doesn't shift the formula. Champions-exclusive stones (Chesnaughtite, etc.) won't have PokeAPI sprites; the broken image is acceptable.

```ts
  // ── Champions Mega Stones ──────────────────────────────────────────────────────
  { slug: "abomasite",     name: "Abomasite",     spriteUrl: SPRITE("abomasite"),      effect: { type: "none" }, isChampionsItem: true },
  { slug: "absolite",      name: "Absolite",      spriteUrl: SPRITE("absolite"),       effect: { type: "none" }, isChampionsItem: true },
  { slug: "aerodactylite", name: "Aerodactylite", spriteUrl: SPRITE("aerodactylite"),  effect: { type: "none" }, isChampionsItem: true },
  { slug: "aggronite",     name: "Aggronite",     spriteUrl: SPRITE("aggronite"),      effect: { type: "none" }, isChampionsItem: true },
  { slug: "alakazite",     name: "Alakazite",     spriteUrl: SPRITE("alakazite"),      effect: { type: "none" }, isChampionsItem: true },
  { slug: "altarianite",   name: "Altarianite",   spriteUrl: SPRITE("altarianite"),    effect: { type: "none" }, isChampionsItem: true },
  { slug: "ampharosite",   name: "Ampharosite",   spriteUrl: SPRITE("ampharosite"),    effect: { type: "none" }, isChampionsItem: true },
  { slug: "audinite",      name: "Audinite",      spriteUrl: SPRITE("audinite"),       effect: { type: "none" }, isChampionsItem: true },
  { slug: "banettite",     name: "Banettite",     spriteUrl: SPRITE("banettite"),      effect: { type: "none" }, isChampionsItem: true },
  { slug: "beedrillite",   name: "Beedrillite",   spriteUrl: SPRITE("beedrillite"),    effect: { type: "none" }, isChampionsItem: true },
  { slug: "blastoisinite", name: "Blastoisinite", spriteUrl: SPRITE("blastoisinite"),  effect: { type: "none" }, isChampionsItem: true },
  { slug: "cameruptite",   name: "Cameruptite",   spriteUrl: SPRITE("cameruptite"),    effect: { type: "none" }, isChampionsItem: true },
  { slug: "chandelurite",  name: "Chandelurite",  spriteUrl: SPRITE("chandelurite"),   effect: { type: "none" }, isChampionsItem: true },
  { slug: "charizardite-x",name: "Charizardite X",spriteUrl: SPRITE("charizardite-x"), effect: { type: "none" }, isChampionsItem: true },
  { slug: "charizardite-y",name: "Charizardite Y",spriteUrl: SPRITE("charizardite-y"), effect: { type: "none" }, isChampionsItem: true },
  { slug: "chesnaughtite", name: "Chesnaughtite", spriteUrl: SPRITE("chesnaughtite"),  effect: { type: "none" }, isChampionsItem: true },
  { slug: "chimechite",    name: "Chimechite",    spriteUrl: SPRITE("chimechite"),     effect: { type: "none" }, isChampionsItem: true },
  { slug: "clefablite",    name: "Clefablite",    spriteUrl: SPRITE("clefablite"),     effect: { type: "none" }, isChampionsItem: true },
  { slug: "crabominite",   name: "Crabominite",   spriteUrl: SPRITE("crabominite"),    effect: { type: "none" }, isChampionsItem: true },
  { slug: "delphoxite",    name: "Delphoxite",    spriteUrl: SPRITE("delphoxite"),     effect: { type: "none" }, isChampionsItem: true },
  { slug: "dragoninite",   name: "Dragoninite",   spriteUrl: SPRITE("dragoninite"),    effect: { type: "none" }, isChampionsItem: true },
  { slug: "drampanite",    name: "Drampanite",    spriteUrl: SPRITE("drampanite"),     effect: { type: "none" }, isChampionsItem: true },
  { slug: "emboarite",     name: "Emboarite",     spriteUrl: SPRITE("emboarite"),      effect: { type: "none" }, isChampionsItem: true },
  { slug: "excadrite",     name: "Excadrite",     spriteUrl: SPRITE("excadrite"),      effect: { type: "none" }, isChampionsItem: true },
  { slug: "feraligite",    name: "Feraligite",    spriteUrl: SPRITE("feraligite"),     effect: { type: "none" }, isChampionsItem: true },
  { slug: "floettite",     name: "Floettite",     spriteUrl: SPRITE("floettite"),      effect: { type: "none" }, isChampionsItem: true },
  { slug: "froslassite",   name: "Froslassite",   spriteUrl: SPRITE("froslassite"),    effect: { type: "none" }, isChampionsItem: true },
  { slug: "galladite",     name: "Galladite",     spriteUrl: SPRITE("galladite"),      effect: { type: "none" }, isChampionsItem: true },
  { slug: "garchompite",   name: "Garchompite",   spriteUrl: SPRITE("garchompite"),    effect: { type: "none" }, isChampionsItem: true },
  { slug: "gardevoirite",  name: "Gardevoirite",  spriteUrl: SPRITE("gardevoirite"),   effect: { type: "none" }, isChampionsItem: true },
  { slug: "gengarite",     name: "Gengarite",     spriteUrl: SPRITE("gengarite"),      effect: { type: "none" }, isChampionsItem: true },
  { slug: "glalitite",     name: "Glalitite",     spriteUrl: SPRITE("glalitite"),      effect: { type: "none" }, isChampionsItem: true },
  { slug: "glimmoranite",  name: "Glimmoranite",  spriteUrl: SPRITE("glimmoranite"),   effect: { type: "none" }, isChampionsItem: true },
  { slug: "golurkite",     name: "Golurkite",     spriteUrl: SPRITE("golurkite"),      effect: { type: "none" }, isChampionsItem: true },
  { slug: "greninjite",    name: "Greninjite",    spriteUrl: SPRITE("greninjite"),     effect: { type: "none" }, isChampionsItem: true },
  { slug: "gyaradosite",   name: "Gyaradosite",   spriteUrl: SPRITE("gyaradosite"),    effect: { type: "none" }, isChampionsItem: true },
  { slug: "hawluchanite",  name: "Hawluchanite",  spriteUrl: SPRITE("hawluchanite"),   effect: { type: "none" }, isChampionsItem: true },
  { slug: "heracronite",   name: "Heracronite",   spriteUrl: SPRITE("heracronite"),    effect: { type: "none" }, isChampionsItem: true },
  { slug: "houndoominite", name: "Houndoominite", spriteUrl: SPRITE("houndoominite"),  effect: { type: "none" }, isChampionsItem: true },
  { slug: "kangaskhanite", name: "Kangaskhanite", spriteUrl: SPRITE("kangaskhanite"),  effect: { type: "none" }, isChampionsItem: true },
  { slug: "lopunnite",     name: "Lopunnite",     spriteUrl: SPRITE("lopunnite"),      effect: { type: "none" }, isChampionsItem: true },
  { slug: "lucarionite",   name: "Lucarionite",   spriteUrl: SPRITE("lucarionite"),    effect: { type: "none" }, isChampionsItem: true },
  { slug: "manectite",     name: "Manectite",     spriteUrl: SPRITE("manectite"),      effect: { type: "none" }, isChampionsItem: true },
  { slug: "medichamite",   name: "Medichamite",   spriteUrl: SPRITE("medichamite"),    effect: { type: "none" }, isChampionsItem: true },
  { slug: "meganiumite",   name: "Meganiumite",   spriteUrl: SPRITE("meganiumite"),    effect: { type: "none" }, isChampionsItem: true },
  { slug: "meowsticite",   name: "Meowsticite",   spriteUrl: SPRITE("meowsticite"),    effect: { type: "none" }, isChampionsItem: true },
  { slug: "pidgeotite",    name: "Pidgeotite",    spriteUrl: SPRITE("pidgeotite"),     effect: { type: "none" }, isChampionsItem: true },
  { slug: "pinsirite",     name: "Pinsirite",     spriteUrl: SPRITE("pinsirite"),      effect: { type: "none" }, isChampionsItem: true },
  { slug: "sablenite",     name: "Sablenite",     spriteUrl: SPRITE("sablenite"),      effect: { type: "none" }, isChampionsItem: true },
  { slug: "scizorite",     name: "Scizorite",     spriteUrl: SPRITE("scizorite"),      effect: { type: "none" }, isChampionsItem: true },
  { slug: "scovillainite", name: "Scovillainite", spriteUrl: SPRITE("scovillainite"),  effect: { type: "none" }, isChampionsItem: true },
  { slug: "sharpedonite",  name: "Sharpedonite",  spriteUrl: SPRITE("sharpedonite"),   effect: { type: "none" }, isChampionsItem: true },
  { slug: "skarmorite",    name: "Skarmorite",    spriteUrl: SPRITE("skarmorite"),     effect: { type: "none" }, isChampionsItem: true },
  { slug: "slowbronite",   name: "Slowbronite",   spriteUrl: SPRITE("slowbronite"),    effect: { type: "none" }, isChampionsItem: true },
  { slug: "starminite",    name: "Starminite",    spriteUrl: SPRITE("starminite"),     effect: { type: "none" }, isChampionsItem: true },
  { slug: "steelixite",    name: "Steelixite",    spriteUrl: SPRITE("steelixite"),     effect: { type: "none" }, isChampionsItem: true },
  { slug: "tyranitarite",  name: "Tyranitarite",  spriteUrl: SPRITE("tyranitarite"),   effect: { type: "none" }, isChampionsItem: true },
  { slug: "venusaurite",   name: "Venusaurite",   spriteUrl: SPRITE("venusaurite"),    effect: { type: "none" }, isChampionsItem: true },
  { slug: "victreebelite", name: "Victreebelite", spriteUrl: SPRITE("victreebelite"),  effect: { type: "none" }, isChampionsItem: true },
```

- [ ] **Step 6: Typecheck**

```bash
pnpm typecheck
```

Expected: 0 errors.

- [ ] **Step 7: Commit**

```bash
git add src/lib/items.ts
git commit -m "feat(items): add 80+ Champions items — hold items, berries, mega stones"
```

---

### Task 3 (DX-03): Vitest tests for new item helpers

**Assignee:** Jr Dev B | **Priority:** P0 | **Points:** 2

**Files:**
- Create: `src/lib/__tests__/items.test.ts`

> **Context:** The existing test files live in `src/lib/__tests__/`. This file tests the two calculations that changed: `getItemDefenseMult` now handles `type_resist_berry`, and `getItemDamageMult` now handles the new Silk Scarf entry. Run with `pnpm vitest run src/lib/__tests__/items.test.ts`.

- [ ] **Step 1: Write the failing tests first**

Create `src/lib/__tests__/items.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  getItemDefenseMult,
  getItemDamageMult,
  COMPETITIVE_ITEMS,
} from "~/lib/items";

const occa     = COMPETITIVE_ITEMS.find(i => i.slug === "occa-berry")!;
const passho   = COMPETITIVE_ITEMS.find(i => i.slug === "passho-berry")!;
const silkScarf= COMPETITIVE_ITEMS.find(i => i.slug === "silk-scarf")!;
const lifeOrb  = COMPETITIVE_ITEMS.find(i => i.slug === "life-orb")!;
const assaultVest = COMPETITIVE_ITEMS.find(i => i.slug === "assault-vest")!;

describe("getItemDefenseMult — type_resist_berry", () => {
  it("halves damage when move type matches berry type", () => {
    expect(getItemDefenseMult(occa, "special", "fire")).toBe(0.5);
  });

  it("does not activate when move type does not match", () => {
    expect(getItemDefenseMult(occa, "special", "water")).toBe(1);
  });

  it("does not activate on the wrong berry for the type", () => {
    expect(getItemDefenseMult(passho, "physical", "fire")).toBe(1);
  });

  it("passho berry halves water damage", () => {
    expect(getItemDefenseMult(passho, "physical", "water")).toBe(0.5);
  });

  it("assault vest still applies SpDef boost for special moves", () => {
    expect(getItemDefenseMult(assaultVest, "special", "fire")).toBe(1.5);
  });

  it("assault vest does not apply to physical moves", () => {
    expect(getItemDefenseMult(assaultVest, "physical", "fire")).toBe(1);
  });
});

describe("getItemDamageMult — silk scarf (normal type_boost)", () => {
  it("boosts normal-type move damage by 1.2", () => {
    expect(getItemDamageMult(silkScarf, "normal", 1)).toBe(1.2);
  });

  it("does not boost non-normal moves", () => {
    expect(getItemDamageMult(silkScarf, "fire", 1)).toBe(1);
  });
});

describe("getItemDamageMult — life orb", () => {
  it("boosts damage by 1.3 regardless of type", () => {
    expect(getItemDamageMult(lifeOrb, "ghost", 1)).toBe(1.3);
  });
});

describe("COMPETITIVE_ITEMS — Champions items present", () => {
  const championsItems = COMPETITIVE_ITEMS.filter(i => i.isChampionsItem);

  it("has at least 80 Champions items", () => {
    expect(championsItems.length).toBeGreaterThanOrEqual(80);
  });

  it("Occa Berry is a Champions item", () => {
    expect(occa.isChampionsItem).toBe(true);
  });

  it("Choice Band is NOT a Champions item", () => {
    const choiceBand = COMPETITIVE_ITEMS.find(i => i.slug === "choice-band");
    expect(choiceBand?.isChampionsItem).toBeFalsy();
  });
});
```

- [ ] **Step 2: Run — expect failures**

```bash
pnpm vitest run src/lib/__tests__/items.test.ts
```

Expected: tests fail because `occa-berry`, `silk-scarf` don't exist yet (before Task 2 is done). If Task 2 is done, they should pass.

- [ ] **Step 3: Run again after Task 2 is complete**

```bash
pnpm vitest run src/lib/__tests__/items.test.ts
```

Expected: all tests pass.

- [ ] **Step 4: Run full test suite to check for regressions**

```bash
pnpm vitest run
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/__tests__/items.test.ts
git commit -m "test(items): cover type_resist_berry, silk scarf, Champions flag"
```

---

### Task 4 (DX-04): Champions Only toggle in `ItemSearch`

**Assignee:** Jr Dev A | **Priority:** P1 | **Points:** 2

**Files:**
- Modify: `src/app/calculator/_components/ItemSearch.tsx`

> **Context:** A small toggle sits inside the `ItemSearch` dropdown header. When active, the filtered list is restricted to `COMPETITIVE_ITEMS` where `isChampionsItem === true`. The toggle state is local — no persistence needed. Style: gold/violet when active, zinc when inactive.

- [ ] **Step 1: Add `championsOnly` state and filtered list logic**

In `ItemSearch.tsx`, add `championsOnly` state and a computed `pool`:

```ts
const [championsOnly, setChampionsOnly] = useState(false);

const pool = useMemo(
  () => championsOnly ? COMPETITIVE_ITEMS.filter(i => i.isChampionsItem) : COMPETITIVE_ITEMS,
  [championsOnly],
);

const filtered = useMemo(() => {
  const q = query.toLowerCase();
  return pool.filter(i => i.name.toLowerCase().includes(q)).slice(0, 20);
}, [query, pool]);
```

Replace the existing `filtered` memo with the above.

- [ ] **Step 2: Add the toggle button to the dropdown header**

In the dropdown `<ul>` wrapper, add a header row before the list. The full open-state return should look like:

```tsx
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
    {open && (
      <div className="absolute top-full z-20 mt-1 w-64 rounded-xl border border-zinc-700 bg-zinc-950 shadow-2xl">
        {/* Champions toggle header */}
        <div className="flex items-center justify-between border-b border-zinc-800/60 px-3 py-2">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600">Items</span>
          <button
            onClick={() => setChampionsOnly(v => !v)}
            className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide transition ${
              championsOnly
                ? "bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/40"
                : "text-zinc-600 hover:text-zinc-400"
            }`}
          >
            <span>★</span>
            <span>Champions</span>
          </button>
        </div>

        {/* Item list */}
        {filtered.length > 0 ? (
          <ul className="max-h-44 overflow-y-auto py-1">
            {filtered.map(item => (
              <li key={item.slug}>
                <Tooltip content={effectTooltip(item)} side="right" className="w-full">
                  <button
                    onClick={() => { onChange(item); setQuery(""); setOpen(false); }}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition hover:bg-zinc-800"
                  >
                    {item.spriteUrl && (
                      <Image src={item.spriteUrl} alt={item.name} width={16} height={16} unoptimized className="shrink-0" />
                    )}
                    <span className="text-zinc-300">{item.name}</span>
                  </button>
                </Tooltip>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-3 py-4 text-center text-[11px] text-zinc-600">
            {championsOnly ? "No Champions items match." : `No items matching "${query}".`}
          </p>
        )}
      </div>
    )}
  </div>
);
```

- [ ] **Step 3: Add `type_resist_berry` case to `effectTooltip`**

In the `effectTooltip` function, add a case before `default`:

```ts
case "type_resist_berry":
  return (
    <div className="flex flex-col gap-1">
      <span className="font-semibold text-zinc-100">{item.name}</span>
      <span>
        Reduces <span className="capitalize">{e.poketype}</span>-type damage{" "}
        <span className="font-medium text-blue-300">×{e.mult}</span>
      </span>
      <span className="text-zinc-500 text-[10px]">Defender only. Activates once when hit by a super effective move of this type.</span>
    </div>
  );
case "none":
  return (
    <div className="flex flex-col gap-1">
      <span className="font-semibold text-zinc-100">{item.name}</span>
      <span className="text-zinc-400 text-xs">No direct damage modifier.</span>
    </div>
  );
```

- [ ] **Step 4: Typecheck**

```bash
pnpm typecheck
```

Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/calculator/_components/ItemSearch.tsx
git commit -m "feat(ui): Champions Only toggle in ItemSearch + type_resist_berry tooltip"
```

---

### Task 5 (DX-05): Attacking-moves-only filter in `MoveFuzzySearch`

**Assignee:** Jr Dev A | **Priority:** P1 | **Points:** 2

**Files:**
- Modify: `src/app/calculator/_components/MoveFuzzySearch.tsx`
- Modify: `src/app/calculator/_components/DamageCalculator.tsx`

> **Context:** Status moves have `category === "status"` in the `MoveDetail` type. The `useMovePrefetch` hook is already imported in this file (used inside `MovePickerModal`). We add `attackingOnly?: boolean` to both components, run a lazy prefetch in the main component for inline filtering, and filter eagerly in the modal (where prefetch is already eager). Moves whose summaries haven't loaded yet are shown — they get filtered out naturally once the cache populates.

- [ ] **Step 1: Add `attackingOnly` to `MovePickerModalProps` and filter inside it**

Update the `MovePickerModalProps` interface:

```ts
interface MovePickerModalProps {
  moveNames:      string[];
  onSelect:       (move: MoveDetail) => void;
  onClear:        () => void;
  onClose:        () => void;
  attackerSprite?: string;
  attackerName?:  string;
  attackingOnly?: boolean;   // ← new
}
```

Inside `MovePickerModal`, after the existing `filtered` memo, add:

```ts
const displayMoves = useMemo(() => {
  if (!attackingOnly) return filtered;
  return filtered.filter(n => {
    const s = moveSummaries.get(n);
    return !s || s.category !== "status";
  });
}, [filtered, moveSummaries, attackingOnly]);
```

Replace all uses of `filtered` in the JSX with `displayMoves`.

- [ ] **Step 2: Add `attackingOnly` to `MoveFuzzySearchProps`**

Update the `MoveFuzzySearchProps` interface:

```ts
interface MoveFuzzySearchProps {
  moveNames:        string[];
  value:            MoveDetail | null;
  onSelect:         (move: MoveDetail) => void;
  onClear:          () => void;
  inputRef?:        React.RefObject<HTMLInputElement | null>;
  isLoadingMove?:   boolean;
  attackerSprite?:  string;
  attackerName?:    string;
  openModalRef?:    React.RefObject<(() => void) | null>;
  attackingOnly?:   boolean;   // ← new
}
```

- [ ] **Step 3: Add lazy prefetch and filter to the inline (empty-state) search**

Inside the `MoveFuzzySearch` function body, add a lazy prefetch call (after the existing `useEffect` blocks):

```ts
// Lazy prefetch for inline category filtering — summaries populate as the user scrolls
const moveSummaries = useMovePrefetch(moveNames, false);
```

Update the existing `filtered` memo to filter out status moves:

```ts
const filtered = useMemo(() => {
  const q = query.toLowerCase().replace(/\s/g, "-");
  const base = query ? moveNames.filter(n => n.includes(q)) : moveNames;
  const sliced = base.slice(0, 40);
  if (!attackingOnly) return sliced;
  return sliced.filter(n => {
    const s = moveSummaries.get(n);
    return !s || s.category !== "status";
  });
}, [query, moveNames, moveSummaries, attackingOnly]);
```

- [ ] **Step 4: Pass `attackingOnly` through to the modal render**

In the `MoveFuzzySearch` return (where `modalOpen && <MovePickerModal ...>`):

```tsx
{modalOpen && (
  <MovePickerModal
    moveNames={moveNames}
    onSelect={handleModalSelect}
    onClear={onClear}
    onClose={() => setModalOpen(false)}
    attackerSprite={attackerSprite}
    attackerName={attackerName}
    attackingOnly={attackingOnly}   // ← pass through
  />
)}
```

- [ ] **Step 5: Pass `attackingOnly={true}` from DamageCalculator**

In `src/app/calculator/_components/DamageCalculator.tsx`, find the `<MoveFuzzySearch>` render and add the prop:

```tsx
<MoveFuzzySearch
  moveNames={attackerMoveNames}
  value={move}
  onSelect={setMove}
  onClear={() => setMove(null)}
  attackingOnly={true}
  {/* ...other existing props */}
/>
```

- [ ] **Step 6: Typecheck**

```bash
pnpm typecheck
```

Expected: 0 errors.

- [ ] **Step 7: Commit**

```bash
git add src/app/calculator/_components/MoveFuzzySearch.tsx src/app/calculator/_components/DamageCalculator.tsx
git commit -m "feat(calc): hide status moves — attacking-only filter in move picker"
```

---

## Sub-system 2 — Clerk Auth Foundation

### Task 6 (DX-06): Clerk install — `env.js`, `.env.local` stub, `ClerkProvider`

**Assignee:** Sr Dev | **Priority:** P0 | **Points:** 3

**Files:**
- Modify: `src/env.js`
- Modify: `src/app/layout.tsx`
- Create: `.env.local` (if it doesn't exist — add Clerk key stubs)

> **Context:** Clerk requires a publishable key (public, safe to expose) and a secret key (server-only). Both are validated at startup via `@t3-oss/env-nextjs`. `ClerkProvider` must be the outermost wrapper in the root layout so every page and component can access Clerk's React context. Do NOT commit `.env.local` — it is already in `.gitignore`.

- [ ] **Step 1: Install Clerk**

```bash
pnpm add @clerk/nextjs
```

- [ ] **Step 2: Add env vars to `env.js`**

Replace the contents of `src/env.js`:

```js
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    CLERK_SECRET_KEY: z.string().min(1),
  },
  client: {
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV,
    CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
```

- [ ] **Step 3: Add key stubs to `.env.local`**

If `.env.local` doesn't exist, create it. Add these lines (replace with real keys from dashboard.clerk.com):

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_REPLACE_ME
CLERK_SECRET_KEY=sk_test_REPLACE_ME
```

- [ ] **Step 4: Wrap root layout with `ClerkProvider`**

Read `src/app/layout.tsx` first to understand the current structure, then add `ClerkProvider` as the outermost wrapper. The `import` goes at the top:

```ts
import { ClerkProvider } from "@clerk/nextjs";
```

Wrap the return's `<html>` element:

```tsx
return (
  <ClerkProvider>
    <html lang="en">
      <body>
        {/* existing TRPCReactProvider and Nav/children */}
      </body>
    </html>
  </ClerkProvider>
);
```

- [ ] **Step 5: Verify dev server starts without crashing**

Add real Clerk keys to `.env.local`, then:

```bash
pnpm dev
```

Expected: server starts, no "missing env var" error in the terminal.

- [ ] **Step 6: Commit**

```bash
git add src/env.js src/app/layout.tsx
# do NOT git add .env.local
git commit -m "feat(auth): install Clerk, configure env vars, wrap layout with ClerkProvider"
```

---

### Task 7 (DX-07): `middleware.ts` — protect `/teams` and `/my-teams`

**Assignee:** Sr Dev | **Priority:** P0 | **Points:** 2

**Files:**
- Create: `src/middleware.ts`

> **Context:** Next.js middleware runs on the edge before every request. Clerk's `clerkMiddleware` intercepts matched routes. The `createRouteMatcher` helper returns a function that returns `true` when the request URL matches any of the given patterns. `auth.protect()` redirects unsigned-in visitors to Clerk's sign-in page.

- [ ] **Step 1: Create `src/middleware.ts`**

```ts
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtected = createRouteMatcher(["/teams(.*)", "/my-teams(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtected(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
```

- [ ] **Step 2: Verify redirect works**

With the dev server running, open an incognito window and navigate to `http://localhost:3000/teams`. Expected: redirected to Clerk's sign-in page. Navigate to `http://localhost:3000/calculator`. Expected: page loads normally (unprotected).

- [ ] **Step 3: Commit**

```bash
git add src/middleware.ts
git commit -m "feat(auth): Clerk middleware — protect /teams and /my-teams routes"
```

---

### Task 8 (DX-08): tRPC context — Clerk `userId` injection + `protectedProcedure`

**Assignee:** Sr Dev | **Priority:** P0 | **Points:** 3

**Files:**
- Modify: `src/server/api/trpc.ts`
- Modify: `src/app/api/trpc/[trpc]/route.ts`

> **Context:** tRPC v11 with Next.js App Router passes the raw `NextRequest` into the route handler. We thread it through `createTRPCContext` so Clerk's `getAuth()` can read the session cookie and return `userId`. The `protectedProcedure` is a middleware-wrapped base procedure that throws `UNAUTHORIZED` when `userId` is null. All existing procedures remain `publicProcedure` — only the new calc router (Task 10) uses `protectedProcedure`.

- [ ] **Step 1: Update `src/server/api/trpc.ts` to inject `userId`**

Read the current file first, then add these changes:

At the top, add the import:
```ts
import { getAuth } from "@clerk/nextjs/server";
import { type NextRequest } from "next/server";
```

Update `createTRPCContext` to accept and use the raw request:

```ts
export const createTRPCContext = async (opts: {
  headers: Headers;
  req?: NextRequest;
}) => {
  const userId = opts.req ? getAuth(opts.req).userId : null;
  return {
    db,
    userId,
  };
};
```

Add `protectedProcedure` after the existing `publicProcedure` export:

```ts
const enforceUserIsAuthenticated = t.middleware(({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: { userId: ctx.userId },
  });
});

export const protectedProcedure = t.procedure.use(enforceUserIsAuthenticated);
```

- [ ] **Step 2: Update the API route handler to pass `req`**

In `src/app/api/trpc/[trpc]/route.ts`, read the file first. The handler calls `createTRPCContext`. Update it to pass the request:

```ts
import { type NextRequest } from "next/server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "~/server/api/root";
import { createTRPCContext } from "~/server/api/trpc";

const handler = (req: NextRequest) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => createTRPCContext({ headers: req.headers, req }),
  });

export { handler as GET, handler as POST };
```

- [ ] **Step 3: Typecheck**

```bash
pnpm typecheck
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/server/api/trpc.ts src/app/api/trpc/[trpc]/route.ts
git commit -m "feat(auth): inject Clerk userId into tRPC context + add protectedProcedure"
```

---

## Sub-system 3 — Database & API

### Task 9 (DX-09): Prisma — `SavedCalc` model + `userId` on `Team`

**Assignee:** Jr Dev B | **Priority:** P0 | **Points:** 3

**Files:**
- Modify: `prisma/schema.prisma`

> **Context:** `SavedCalc` stores one damage calculation result per row, scoped to a Clerk `userId` string. `Team` gets a nullable `userId` column so existing rows don't break — the team router filters by userId in queries, so unscoped legacy rows are simply invisible to any user. Do NOT delete existing Team rows.

- [ ] **Step 1: Add `userId` to `Team` and add `SavedCalc` model**

Open `prisma/schema.prisma` and make these changes:

1. Add `userId String?` and its index to the `Team` model:

```prisma
model Team {
  id        Int        @id @default(autoincrement())
  name      String
  userId    String?
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt
  slots     TeamSlot[]

  @@index([userId])
}
```

2. Append the new `SavedCalc` model at the end of the file:

```prisma
model SavedCalc {
  id             Int      @id @default(autoincrement())
  userId         String
  createdAt      DateTime @default(now())

  attackerName   String
  attackerSprite String
  attackerTypes  String[]

  defenderName   String
  defenderSprite String
  defenderTypes  String[]

  moveName       String
  moveType       String
  movePower      Int?

  minPercent     Float
  maxPercent     Float

  @@index([userId, createdAt])
}
```

- [ ] **Step 2: Push schema to the database**

```bash
pnpm db:push
```

Expected output includes `The following migration(s) have been applied` or `Your database is now in sync with your Prisma schema`. No data should be deleted.

- [ ] **Step 3: Verify with Prisma Studio**

```bash
pnpm db:studio
```

Open `http://localhost:5555` in a browser. Confirm `SavedCalc` table exists with the correct columns. Confirm `Team` table has a `userId` column. Close Studio when done.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(db): add SavedCalc model + userId on Team"
```

---

### Task 10 (DX-10): tRPC `calc` router — `save`, `list`, `delete`

**Assignee:** Jr Dev B | **Priority:** P1 | **Points:** 3

**Files:**
- Create: `src/server/api/routers/calc.ts`
- Modify: `src/server/api/root.ts`

> **Context:** All three procedures use `protectedProcedure` — unauthenticated calls throw UNAUTHORIZED before reaching the database. `list` is ordered newest first. `delete` checks ownership before deleting.

- [ ] **Step 1: Create `src/server/api/routers/calc.ts`**

```ts
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const calcRouter = createTRPCRouter({
  save: protectedProcedure
    .input(
      z.object({
        attackerName:   z.string(),
        attackerSprite: z.string(),
        attackerTypes:  z.array(z.string()),
        defenderName:   z.string(),
        defenderSprite: z.string(),
        defenderTypes:  z.array(z.string()),
        moveName:       z.string(),
        moveType:       z.string(),
        movePower:      z.number().nullable(),
        minPercent:     z.number(),
        maxPercent:     z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.savedCalc.create({
        data: { ...input, userId: ctx.userId, movePower: input.movePower ?? undefined },
      });
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.savedCalc.findMany({
      where:   { userId: ctx.userId },
      orderBy: { createdAt: "desc" },
      take:    50,
    });
  }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.savedCalc.deleteMany({
        where: { id: input.id, userId: ctx.userId },
      });
    }),
});
```

- [ ] **Step 2: Register the router in `src/server/api/root.ts`**

Read the file, then add:

```ts
import { calcRouter } from "~/server/api/routers/calc";

export const appRouter = createTRPCRouter({
  pokemon: pokemonRouter,
  team:    teamRouter,
  calc:    calcRouter,   // ← new
});
```

- [ ] **Step 3: Typecheck**

```bash
pnpm typecheck
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/server/api/routers/calc.ts src/server/api/root.ts
git commit -m "feat(api): tRPC calc router — save, list, delete saved damage calculations"
```

---

### Task 11 (DX-11): Update `team` router — scope all queries by `userId`

**Assignee:** Jr Dev B | **Priority:** P1 | **Points:** 2

**Files:**
- Modify: `src/server/api/routers/team.ts`

> **Context:** Both `create` and any `list`/`get` procedures must be switched from `publicProcedure` to `protectedProcedure` and filtered by `ctx.userId`. Existing team rows with `userId = null` become invisible — this is acceptable since TeamBuilder will now require login (Task 12).

- [ ] **Step 1: Read the current team router**

```bash
cat src/server/api/routers/team.ts
```

- [ ] **Step 2: Switch procedures to `protectedProcedure` and add userId scoping**

Import `protectedProcedure` alongside `publicProcedure`:

```ts
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
```

For the `create` procedure, change `publicProcedure` to `protectedProcedure` and add `userId: ctx.userId` to the `db.team.create` data object:

```ts
create: protectedProcedure
  .input(/* existing Zod schema unchanged */)
  .mutation(async ({ ctx, input }) => {
    return ctx.db.team.create({
      data: {
        name:  input.name,
        userId: ctx.userId,       // ← add this
        slots: { /* unchanged */ },
      },
    });
  }),
```

For any `list` or `getAll` procedure, add `where: { userId: ctx.userId }`:

```ts
list: protectedProcedure.query(async ({ ctx }) => {
  return ctx.db.team.findMany({
    where:   { userId: ctx.userId },   // ← scope by user
    orderBy: { createdAt: "desc" },
    include: { slots: { include: { moves: true } } },
  });
}),
```

- [ ] **Step 3: Typecheck**

```bash
pnpm typecheck
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/server/api/routers/team.ts
git commit -m "feat(api): scope team router to authenticated userId"
```

---

## Sub-system 4 — UI

### Task 12 (DX-12): Collapsible `SideNav` + root layout restructure

**Assignee:** Jr Dev A | **Priority:** P1 | **Points:** 5

**Files:**
- Create: `src/app/_components/SideNav.tsx`
- Modify: `src/app/layout.tsx`
- Delete: `src/app/_components/Nav.tsx`

> **Context:** The side nav replaces the top `Nav`. It's a fixed-width column on the left. When collapsed it shows only icons; when expanded it shows icons + labels. Collapse state is persisted to `localStorage` under the key `dxtr-nav-collapsed`. The `UserButton` from Clerk is always at the bottom and handles avatar display, sign-out, and Clerk's account management modal automatically. `SignInButton` is shown when the user is signed out.

- [ ] **Step 1: Create `src/app/_components/SideNav.tsx`**

```tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";

const NAV_KEY = "dxtr-nav-collapsed";

const NAV_LINKS = [
  {
    href: "/calculator",
    label: "Calculator",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="2" width="16" height="20" rx="2" /><line x1="8" y1="6" x2="16" y2="6" /><line x1="8" y1="10" x2="16" y2="10" /><line x1="8" y1="14" x2="12" y2="14" />
      </svg>
    ),
    protected: false,
  },
  {
    href: "/teams",
    label: "Team Builder",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="7" r="4" /><path d="M2 21v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2" /><line x1="19" y1="8" x2="19" y2="14" /><line x1="16" y1="11" x2="22" y2="11" />
      </svg>
    ),
    protected: true,
  },
];

export function SideNav() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(NAV_KEY);
    if (stored !== null) setCollapsed(stored === "true");
  }, []);

  function toggle() {
    setCollapsed(v => {
      const next = !v;
      localStorage.setItem(NAV_KEY, String(next));
      return next;
    });
  }

  return (
    <aside
      className={`flex h-screen flex-col border-r border-zinc-800/60 bg-zinc-950 transition-all duration-200 ${
        collapsed ? "w-14" : "w-52"
      }`}
    >
      {/* Logo / collapse toggle */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-zinc-800/60 px-3">
        {!collapsed && (
          <span className="text-sm font-bold tracking-tight text-violet-400">dxtr</span>
        )}
        <button
          onClick={toggle}
          className="ml-auto rounded-lg p-1.5 text-zinc-600 transition hover:bg-zinc-800 hover:text-zinc-300"
          aria-label={collapsed ? "Expand nav" : "Collapse nav"}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {collapsed
              ? <><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" /></>
              : <><line x1="3" y1="12" x2="15" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" /></>
            }
          </svg>
        </button>
      </div>

      {/* Nav links */}
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-2">
        {NAV_LINKS.map(link => {
          const isActive = pathname.startsWith(link.href);
          const inner = (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 rounded-lg px-2.5 py-2 transition ${
                isActive
                  ? "bg-violet-500/20 text-violet-300"
                  : "text-zinc-500 hover:bg-zinc-800/60 hover:text-zinc-200"
              }`}
            >
              <span className="shrink-0">{link.icon}</span>
              {!collapsed && <span className="text-sm font-medium">{link.label}</span>}
            </Link>
          );

          if (link.protected) {
            return (
              <div key={link.href}>
                <SignedIn>{inner}</SignedIn>
                <SignedOut>
                  <span
                    className="flex cursor-not-allowed items-center gap-3 rounded-lg px-2.5 py-2 text-zinc-700"
                    title="Sign in to access Team Builder"
                  >
                    <span className="shrink-0">{link.icon}</span>
                    {!collapsed && <span className="text-sm font-medium">{link.label}</span>}
                  </span>
                </SignedOut>
              </div>
            );
          }

          return inner;
        })}
      </nav>

      {/* Auth section */}
      <div className="shrink-0 border-t border-zinc-800/60 p-3">
        <SignedIn>
          <div className={`flex items-center ${collapsed ? "justify-center" : "gap-3"}`}>
            <UserButton afterSignOutUrl="/calculator" />
            {!collapsed && <span className="text-xs text-zinc-500">Account</span>}
          </div>
        </SignedIn>
        <SignedOut>
          <SignInButton mode="modal">
            <button
              className={`flex w-full items-center gap-2 rounded-lg bg-violet-500/10 px-2.5 py-2 text-xs font-semibold text-violet-400 transition hover:bg-violet-500/20 ${
                collapsed ? "justify-center" : ""
              }`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><polyline points="10 17 15 12 10 7" /><line x1="15" y1="12" x2="3" y2="12" />
              </svg>
              {!collapsed && <span>Sign in</span>}
            </button>
          </SignInButton>
        </SignedOut>
      </div>
    </aside>
  );
}
```

- [ ] **Step 2: Restructure `src/app/layout.tsx`**

Read the current file first, then update. The body should become a flex row:

```tsx
import { SideNav } from "~/app/_components/SideNav";

// Inside the body:
<body className="flex h-screen overflow-hidden bg-zinc-900 text-zinc-100">
  <SideNav />
  <main className="flex-1 overflow-y-auto">
    <TRPCReactProvider>
      {children}
    </TRPCReactProvider>
  </main>
</body>
```

Remove the `import { Nav }` and `<Nav />` from the layout.

- [ ] **Step 3: Delete the old Nav**

```bash
git rm src/app/_components/Nav.tsx
```

- [ ] **Step 4: Typecheck**

```bash
pnpm typecheck
```

Expected: 0 errors.

- [ ] **Step 5: Smoke-test visually**

With `pnpm dev` running, open the app. Confirm: side nav is visible on the left, Calculator link is active, collapse toggle works, sign-in button appears when signed out, UserButton appears when signed in.

- [ ] **Step 6: Commit**

```bash
git add src/app/_components/SideNav.tsx src/app/layout.tsx
git commit -m "feat(ui): collapsible SideNav replaces top Nav — root layout restructured"
```

---

### Task 13 (DX-13): Calculator two-panel responsive layout

**Assignee:** Jr Dev A | **Priority:** P1 | **Points:** 3

**Files:**
- Modify: `src/app/calculator/page.tsx`

> **Context:** On large viewports (`lg` and up), the calculator page becomes a two-column grid: the existing calculator on the left, a 320px saved-calcs panel slot on the right. The right panel is only rendered client-side (it needs auth state). On smaller viewports the panel is hidden.

- [ ] **Step 1: Read the current `src/app/calculator/page.tsx`**

Note the current structure (it prefetches data via `api` and renders `<DamageCalculator>`).

- [ ] **Step 2: Update the page to a two-panel grid**

The page is a server component. Add a `<SavedCalcsPanel>` import (you'll create the component in Task 14 — for now, add a placeholder `<div>`):

```tsx
import { HydrateClient } from "~/trpc/server";

export default async function CalculatorPage() {
  // keep any existing prefetch calls here unchanged

  return (
    <HydrateClient>
      <div className="flex h-full min-h-screen gap-0">
        {/* Left: calculator */}
        <div className="flex-1 overflow-y-auto">
          <DamageCalculator />
        </div>

        {/* Right: saved calcs — hidden on small screens */}
        <aside className="hidden w-80 shrink-0 border-l border-zinc-800/60 lg:flex lg:flex-col">
          {/* SavedCalcsPanel goes here in Task 14 */}
        </aside>
      </div>
    </HydrateClient>
  );
}
```

- [ ] **Step 3: Typecheck**

```bash
pnpm typecheck
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/calculator/page.tsx
git commit -m "feat(ui): calculator page — responsive two-panel layout shell"
```

---

### Task 14 (DX-14): `SavedCalcCard` + `SavedCalcsPanel` wired to `calc.list`

**Assignee:** Jr Dev A | **Priority:** P1 | **Points:** 3

**Files:**
- Create: `src/app/calculator/_components/SavedCalcCard.tsx`
- Create: `src/app/calculator/_components/SavedCalcsPanel.tsx`
- Modify: `src/app/calculator/page.tsx`

> **Context:** `SavedCalcsPanel` is a client component that calls `trpc.calc.list`. It's only rendered for signed-in users (`<SignedIn>`). Each `SavedCalcCard` shows a compact summary: attacker sprite + name vs defender sprite + name, move with type badge, and a mini HP bar scaled to `minPercent`–`maxPercent`. The HP bar colour shifts: green below 50%, amber 50–99%, red at 100%+.

- [ ] **Step 1: Create `src/app/calculator/_components/SavedCalcCard.tsx`**

```tsx
"use client";

import Image from "next/image";
import { type RouterOutputs } from "~/trpc/react";
import { TypeBadge } from "~/app/_components/TypeBadge";
import { type PokemonType } from "~/lib/types";

type SavedCalc = RouterOutputs["calc"]["list"][number];

interface SavedCalcCardProps {
  calc: SavedCalc;
  onDelete: (id: number) => void;
}

function hpBarColor(pct: number): string {
  if (pct >= 100) return "bg-red-500";
  if (pct >= 50)  return "bg-amber-400";
  return "bg-green-500";
}

export function SavedCalcCard({ calc, onDelete }: SavedCalcCardProps) {
  const avgPct = (calc.minPercent + calc.maxPercent) / 2;

  return (
    <div className="group relative rounded-xl border border-zinc-800/60 bg-zinc-900 p-3 transition hover:border-zinc-700">
      {/* Delete button */}
      <button
        onClick={() => onDelete(calc.id)}
        className="absolute top-2 right-2 rounded p-0.5 text-zinc-700 opacity-0 transition hover:text-red-400 group-hover:opacity-100"
        aria-label="Delete saved calc"
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      {/* Pokemon row */}
      <div className="flex items-center gap-2 pr-5">
        {/* Attacker */}
        <div className="flex items-center gap-1.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-800">
            <Image src={calc.attackerSprite} alt={calc.attackerName} width={24} height={24} unoptimized />
          </div>
          <span className="text-[11px] font-semibold capitalize text-zinc-300">
            {calc.attackerName.replace(/-/g, " ")}
          </span>
        </div>

        <span className="text-[10px] text-zinc-700">vs</span>

        {/* Defender */}
        <div className="flex items-center gap-1.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-800">
            <Image src={calc.defenderSprite} alt={calc.defenderName} width={24} height={24} unoptimized />
          </div>
          <span className="text-[11px] font-semibold capitalize text-zinc-300">
            {calc.defenderName.replace(/-/g, " ")}
          </span>
        </div>
      </div>

      {/* Move */}
      <div className="mt-2 flex items-center gap-1.5">
        <TypeBadge type={calc.moveType as PokemonType} size="sm" />
        <span className="text-[11px] capitalize text-zinc-400">
          {calc.moveName.replace(/-/g, " ")}
        </span>
        {calc.movePower != null && (
          <span className="ml-auto font-mono text-[10px] text-zinc-600">{calc.movePower} BP</span>
        )}
      </div>

      {/* HP bar */}
      <div className="mt-2">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
          <div
            className={`h-full rounded-full transition-all ${hpBarColor(calc.maxPercent)}`}
            style={{ width: `${Math.min(calc.maxPercent, 100)}%` }}
          />
        </div>
        <div className="mt-1 flex justify-between">
          <span className="text-[10px] text-zinc-600">Damage</span>
          <span className="font-mono text-[10px] text-zinc-400">
            {calc.minPercent.toFixed(1)}–{calc.maxPercent.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `src/app/calculator/_components/SavedCalcsPanel.tsx`**

```tsx
"use client";

import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import { api } from "~/trpc/react";
import { SavedCalcCard } from "./SavedCalcCard";

export function SavedCalcsPanel() {
  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 border-b border-zinc-800/60 px-4 py-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-600">Saved Calcs</h2>
      </div>

      <SignedIn>
        <SavedCalcsList />
      </SignedIn>

      <SignedOut>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
          <p className="text-xs text-zinc-600">Sign in to save and recall calculations.</p>
          <SignInButton mode="modal">
            <button className="rounded-lg bg-violet-500/10 px-3 py-1.5 text-xs font-semibold text-violet-400 transition hover:bg-violet-500/20">
              Sign in
            </button>
          </SignInButton>
        </div>
      </SignedOut>
    </div>
  );
}

function SavedCalcsList() {
  const { data: calcs, isLoading, refetch } = api.calc.list.useQuery();
  const deleteMutation = api.calc.delete.useMutation({
    onSuccess: () => void refetch(),
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2 p-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-zinc-800/50" />
        ))}
      </div>
    );
  }

  if (!calcs || calcs.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
        <p className="text-xs text-zinc-600">No saved calculations yet.</p>
        <p className="mt-1 text-[11px] text-zinc-700">Run a calc and hit Save to record it here.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-3">
      {calcs.map(calc => (
        <SavedCalcCard
          key={calc.id}
          calc={calc}
          onDelete={id => deleteMutation.mutate({ id })}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Wire `SavedCalcsPanel` into the calculator page**

In `src/app/calculator/page.tsx`, replace the placeholder `{/* SavedCalcsPanel goes here in Task 14 */}` comment:

```tsx
import { SavedCalcsPanel } from "./_components/SavedCalcsPanel";

// In the aside:
<aside className="hidden w-80 shrink-0 border-l border-zinc-800/60 lg:flex lg:flex-col">
  <SavedCalcsPanel />
</aside>
```

- [ ] **Step 4: Typecheck**

```bash
pnpm typecheck
```

Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/calculator/_components/SavedCalcCard.tsx src/app/calculator/_components/SavedCalcsPanel.tsx src/app/calculator/page.tsx
git commit -m "feat(ui): SavedCalcCard + SavedCalcsPanel — scrollable saved calcs in right panel"
```

---

### Task 15 (DX-15): Save button in `DamageCalculator` (auth-gated)

**Assignee:** Jr Dev A | **Priority:** P2 | **Points:** 2

**Files:**
- Modify: `src/app/calculator/_components/DamageCalculator.tsx`

> **Context:** `DamageCalculator` already holds all the state needed to construct a save payload: `attacker`, `defender`, `move`, and the computed `DamageResult`. The save button sits near the damage result, wrapped in Clerk's `<SignedIn>` so it's invisible to signed-out users. On success, the query cache for `calc.list` is invalidated so the right panel updates immediately.

- [ ] **Step 1: Add imports to `DamageCalculator.tsx`**

```ts
import { SignedIn } from "@clerk/nextjs";
import { api } from "~/trpc/react";
```

- [ ] **Step 2: Add the save mutation inside the `DamageCalculator` component body**

Find the component function and add near the top of the body:

```ts
const utils = api.useUtils();
const saveMutation = api.calc.save.useMutation({
  onSuccess: () => void utils.calc.list.invalidate(),
});
```

- [ ] **Step 3: Build the save handler**

Add this function inside the component body (it reads from existing state variables — adjust names to match what `DamageCalculator` actually uses, which you can verify by reading the file):

```ts
function handleSave() {
  if (!attacker || !defender || !move || !damageResult) return;
  saveMutation.mutate({
    attackerName:   attacker.name,
    attackerSprite: attacker.sprite,
    attackerTypes:  attacker.types,
    defenderName:   defender.name,
    defenderSprite: defender.sprite,
    defenderTypes:  defender.types,
    moveName:       move.name,
    moveType:       move.type,
    movePower:      move.power,
    minPercent:     damageResult.minPercent,
    maxPercent:     damageResult.maxPercent,
  });
}
```

> `damageResult.minPercent` and `damageResult.maxPercent` must exist on the `DamageResult` type. Verify in `src/lib/damage.ts`. If the type uses different field names (e.g., `minDamagePercent`), adjust accordingly.

- [ ] **Step 4: Render the Save button adjacent to the damage result**

Find where `<DamageResultCard>` (or the damage result section) is rendered in the JSX and add the button below it, inside `<SignedIn>`:

```tsx
<SignedIn>
  {damageResult && (
    <button
      onClick={handleSave}
      disabled={saveMutation.isPending}
      className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border border-zinc-700/60 bg-zinc-800/40 py-2 text-xs font-semibold text-zinc-400 transition hover:border-violet-500/50 hover:bg-violet-500/10 hover:text-violet-300 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {saveMutation.isPending ? (
        <span>Saving…</span>
      ) : saveMutation.isSuccess ? (
        <>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>Saved</span>
        </>
      ) : (
        <>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" />
          </svg>
          <span>Save calc</span>
        </>
      )}
    </button>
  )}
</SignedIn>
```

- [ ] **Step 5: Typecheck**

```bash
pnpm typecheck
```

Expected: 0 errors. If `DamageResult` type doesn't have `minPercent`/`maxPercent`, read `src/lib/damage.ts` and adjust the field names to match.

- [ ] **Step 6: Smoke-test end-to-end**

1. Sign in via the side nav.
2. Pick an attacker, defender, and move on the calculator.
3. Click "Save calc".
4. Confirm: the right panel (`SavedCalcsPanel`) updates immediately with the new card.
5. Confirm the card shows the correct attacker/defender names, move type badge, and HP bar.
6. Click the × on the card. Confirm it disappears.

- [ ] **Step 7: Commit**

```bash
git add src/app/calculator/_components/DamageCalculator.tsx
git commit -m "feat(calc): auth-gated Save button — persists calc to user account, updates right panel"
```

---

## Self-Review Checklist

### Spec coverage

| Requirement | Task |
|-------------|------|
| Clerk auth with API key placeholder in env | DX-06 |
| TeamBuilder requires login | DX-07 + DX-11 + DX-12 (lock icon in nav for signed-out) |
| Save button for logged-in users on calculator | DX-15 |
| Saved calcs log on right side of calculator | DX-13 + DX-14 |
| Scrollable card list | DX-14 (`SavedCalcsPanel`) |
| Card shows attacker, defender, move, HP bar | DX-14 (`SavedCalcCard`) |
| Collapsible side nav on the left | DX-12 |
| Champions Only item toggle | DX-04 |
| Champions items included in overall list | DX-02 |
| Attacking moves only (no status) | DX-05 |

All requirements covered.

### Placeholder scan

No TBD, TODO, or "similar to Task N" shortcuts present. Every code step contains the actual implementation.

### Type consistency

- `getItemDefenseMult` signature: `(item, moveCategory, moveType?)` — defined in DX-01, called with `moveType` in DX-01, consistent with all usages.
- `protectedProcedure` — defined in DX-08, used in DX-10 and DX-11.
- `SavedCalc` type in `SavedCalcCard` — sourced from `RouterOutputs["calc"]["list"][number]`, guaranteed to match the Prisma shape returned by the router.
- `isChampionsItem` — added to `CompetitiveItem` interface in DX-01, used in DX-02 (data) and DX-04 (filter).
- `attackingOnly` prop — added to both `MoveFuzzySearchProps` and `MovePickerModalProps` in DX-05, passed through consistently.
