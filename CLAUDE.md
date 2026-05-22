# CLAUDE.md — dxtr (Pokemon Team Builder & Damage Calculator)

## Project Overview

**dxtr** is an interactive web application for building and saving Pokemon teams, and calculating battle damage with an optimized, visually polished UX. The guiding principle is that every interaction — team selection, moveset config, damage simulation — should feel intuitive and beautiful.

**Stack:** Next.js 15 (App Router) · React 19 · tRPC · Prisma · PostgreSQL · Tailwind CSS v4 · TypeScript · pnpm

---

## Development Team

This project is staffed by a structured AI development team. Each role has a defined model, authority, and responsibility.

### Business Analyst — `claude-opus-4-7`
Owns requirements, feature specs, and the planning pipeline. Translates product goals into well-scoped tickets. Reviews acceptance criteria before any work begins. Writes the initial user stories and success metrics for every feature.

### Senior Developer — `claude-sonnet-4-6`
Leads architecture decisions, reviews all PRs, writes complex business logic, and owns performance/security. Breaks BA specs into technical tasks and assigns them to junior developers. Makes final calls on data modelling, API design, and component architecture.

### Junior Developer A — `claude-haiku-4-5`
Implements UI components, pages, and client-side interactions as directed by the Senior Developer.

### Junior Developer B — `claude-haiku-4-5`
Implements API routes, Prisma queries, and tRPC procedures as directed by the Senior Developer.

---

## Feature Request Protocol

**Every feature request, regardless of size, must go through this pipeline before any code is written.**

### Step 1 — BA writes the Feature Brief
The BA produces a brief with:
- User story: `As a [user], I want [goal] so that [outcome]`
- Acceptance criteria (bulleted, testable)
- Out of scope (explicit)
- Open questions (if any)

### Step 2 — Senior Dev produces the Ticket Plan
The Senior Dev reviews the brief and outputs a **Ticket Plan** for team review. The plan must be presented as a structured table before any implementation begins.

#### Ticket Plan Format

```
## Feature: [Feature Name]
**Status:** PENDING REVIEW

| ID    | Title                         | Type     | Assignee      | Priority | Points | Depends On |
|-------|-------------------------------|----------|---------------|----------|--------|------------|
| DX-01 | [short title]                 | task/bug | Junior A/B/Sr | P0–P3    | 1–8    | —          |
| DX-02 | ...                           | ...      | ...           | ...      | ...    | DX-01      |
```

**Priority scale:**
- `P0` — Blocker. Ships nothing else until done.
- `P1` — Critical path. Sprint must include this.
- `P2` — Important. Schedule this sprint if possible.
- `P3` — Nice to have. Next sprint or backlog.

**Story point scale (Fibonacci):**
- `1` — Trivial change, under 30 min
- `2` — Simple, well-understood task
- `3` — Moderate, some design decisions
- `5` — Complex, cross-cutting or multi-file
- `8` — Large, break down further if possible

### Step 3 — Plan Review
Present the Ticket Plan and wait for user approval before writing any code. If the user requests changes, update the plan and re-present. Implementation begins only after explicit approval.

### Step 4 — Implementation
Work tickets in priority order, completing and marking each done before starting the next (unless tickets are explicitly parallel per the Depends On column).

---

## UI & Design Standards

**The UI is the product.** Every screen must be clean, intentional, and delightful. Generic, unstyled, or "good enough" UI is not acceptable.

### Design Principles
1. **Visual hierarchy first** — the most important action on any screen should be unmistakably obvious.
2. **Type-themed palette** — use Pokemon type colours (`fire`, `water`, `grass`, `psychic`, etc.) as accent colours contextually throughout the app.
3. **Micro-interactions** — hover states, transitions, and selection feedback must feel smooth and intentional.
4. **Density-aware layouts** — team building involves many elements at once; prefer dense but breathable layouts over sparse cards.
5. **Mobile-first** — all layouts must be functional on small screens, then enhanced for larger viewports.

### Component Quality Bar
- Every interactive element must have a visible focus state.
- Loading states must never show raw spinners alone — use skeleton screens or meaningful placeholder UI.
- Empty states must be helpful: explain what should be here and offer a clear call to action.
- Error states must be human-readable and actionable.

### Tailwind CSS v4 Usage
- Use CSS variables for the Pokemon type colour system (defined in `globals.css`).
- Avoid arbitrary values unless no utility exists; prefer extending the theme.
- Use `@layer components` for shared patterns (type badge, stat bar, team slot card).
- Run `pnpm format:write` before committing — Prettier + tailwindcss plugin enforces class ordering.

---

## Architecture Guidelines

### Data Flow
```
PokeAPI (external) → tRPC procedures → Prisma (team persistence) → React Query (client cache) → UI
```

### Key Conventions
- All Pokemon data fetching goes through tRPC routers in `src/server/api/routers/`.
- Client components that need server data use `trpc.useQuery` / `trpc.useMutation` via `~/trpc/react`.
- Server components use `api` from `~/trpc/server` for initial hydration.
- Damage calculation logic lives in `src/lib/damage.ts` — pure functions, no side effects, fully typed.
- Team state managed with React context or Zustand (to be decided at architecture stage per feature plan).

### File Structure
```
src/
  app/
    (routes)/           # Page segments
    _components/        # Shared UI components
  lib/
    damage.ts           # Damage formula logic
    pokemon.ts          # Pokemon data utilities
  server/
    api/routers/        # tRPC routers
    db.ts               # Prisma client
  styles/
    globals.css         # Tailwind base + type colour tokens
```

---

## Commands

```bash
pnpm dev          # Start dev server (Turbo)
pnpm build        # Production build
pnpm check        # Lint + typecheck
pnpm typecheck    # TypeScript only
pnpm db:push      # Push schema changes to DB
pnpm db:studio    # Open Prisma Studio
pnpm format:write # Format all files
```

---

## Core Domain: Pokemon Damage Formula

The standard damage formula for reference:

```
Damage = ((((2 × Level / 5) + 2) × Power × (Atk / Def)) / 50 + 2)
         × STAB × TypeEffectiveness × Random[0.85–1.0]
```

- **STAB** = 1.5 if move type matches user's type, else 1.0
- **TypeEffectiveness** = product of all applicable type matchup multipliers (0, 0.25, 0.5, 1, 2, 4)
- All calculations must support both Physical (Atk/Def) and Special (SpAtk/SpDef) categories.
