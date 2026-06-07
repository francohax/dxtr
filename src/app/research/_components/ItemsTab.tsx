"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { COMPETITIVE_ITEMS, type CompetitiveItem, type ItemEffect } from "~/lib/items";

// ── Effect text helpers ───────────────────────────────────────────────────────

function formatEffect(effect: ItemEffect): string {
  switch (effect.type) {
    case "attack_mult": {
      const cat = effect.category === "physical" ? "Physical Atk" : effect.category === "special" ? "Sp. Atk" : "All Atk";
      return `${cat} ×${effect.mult} — locks holder into last used move`;
    }
    case "damage_mult":
      return effect.superEffectiveOnly
        ? `Final damage ×${effect.mult} (super-effective hits only, no recoil)`
        : `Final damage ×${effect.mult} — holder loses 1/10 max HP per use`;
    case "defense_mult":
      return `Sp. Def ×${effect.mult} — holder cannot use status moves`;
    case "type_boost":
      return `${capitalise(effect.poketype)}-type moves ×${effect.mult}`;
    case "type_resist_berry":
      return `Halves one super-effective ${capitalise(effect.poketype)}-type hit (activates once)`;
    case "none":
      return "No direct damage modifier";
  }
}

function capitalise(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ── Category helpers ──────────────────────────────────────────────────────────

const CATEGORY_ORDER = ["Type Boosters", "Hold Items", "Berries", "Mega Stones", "Tickets"] as const;
type ItemCategory = (typeof CATEGORY_ORDER)[number];

const CATEGORY_COLORS: Record<ItemCategory, string> = {
  "Type Boosters": "#a78bfa",
  "Hold Items":    "#60a5fa",
  "Berries":       "#4ade80",
  "Mega Stones":   "#fb923c",
  "Tickets":       "#f472b6",
};

function getCategory(item: CompetitiveItem): ItemCategory {
  const name = item.name.toLowerCase();
  const slug = item.slug;
  if (name.includes("ticket") || name.includes("coupon")) return "Tickets";
  if (slug.endsWith("ite") || slug === "charizardite-x" || slug === "charizardite-y") return "Mega Stones";
  if (slug.endsWith("-berry")) return "Berries";
  if (item.effect.type === "type_boost") return "Type Boosters";
  return "Hold Items";
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ItemsTab() {
  const [query, setQuery] = useState("");
  const [championsOnly, setChampionsOnly] = useState(true);
  const [activeCategory, setActiveCategory] = useState<ItemCategory | null>(null);
  const [selected, setSelected] = useState<CompetitiveItem | null>(null);

  const pool = useMemo(
    () => (championsOnly ? COMPETITIVE_ITEMS.filter(i => i.isChampionsItem) : COMPETITIVE_ITEMS),
    [championsOnly],
  );

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return pool.filter(i => {
      const nameMatch = !q || i.name.toLowerCase().includes(q);
      const catMatch  = !activeCategory || getCategory(i) === activeCategory;
      return nameMatch && catMatch;
    });
  }, [pool, query, activeCategory]);

  const grouped = useMemo(() => {
    const map = new Map<ItemCategory, CompetitiveItem[]>();
    for (const item of filtered) {
      const cat = getCategory(item);
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(item);
    }
    return CATEGORY_ORDER.filter(c => map.has(c)).map(c => ({ label: c, items: map.get(c)! }));
  }, [filtered]);

  const categoryCounts = useMemo(() => {
    const map = new Map<ItemCategory, number>();
    for (const item of pool) {
      const cat = getCategory(item);
      map.set(cat, (map.get(cat) ?? 0) + 1);
    }
    return map;
  }, [pool]);

  const selectedCategory = selected ? getCategory(selected) : null;
  const selectedCategoryColor = selectedCategory ? CATEGORY_COLORS[selectedCategory] : "#71717a";

  return (
    <div className="flex items-start gap-4">
      {/* ── Left: filters + list ───────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        {/* Search + Champions toggle */}
        <div className="flex items-center gap-2">
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search items…"
            className="flex-1 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-600 outline-none transition focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30"
          />
          <button
            onClick={() => setChampionsOnly(v => !v)}
            className={`flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition ${
              championsOnly
                ? "border-amber-500/40 bg-amber-500/10 text-amber-400"
                : "border-zinc-700 bg-zinc-900 text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <span>★</span>
            <span>Champions</span>
          </button>
        </div>

        {/* Category pills */}
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setActiveCategory(null)}
            className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
              activeCategory === null
                ? "border-violet-500/40 bg-violet-500/15 text-violet-300"
                : "border-zinc-800 text-zinc-600 hover:border-zinc-700 hover:text-zinc-400"
            }`}
          >
            All ({pool.length})
          </button>
          {CATEGORY_ORDER.filter(c => categoryCounts.has(c)).map(c => {
            const color = CATEGORY_COLORS[c];
            const count = categoryCounts.get(c) ?? 0;
            const isActive = activeCategory === c;
            return (
              <button
                key={c}
                onClick={() => setActiveCategory(isActive ? null : c)}
                className="rounded-xl border px-3 py-1.5 text-xs font-semibold transition"
                style={isActive
                  ? { color, borderColor: `${color}40`, background: `${color}15` }
                  : { color: "#52525b", borderColor: "#27272a", background: "transparent" }
                }
              >
                {c} ({count})
              </button>
            );
          })}
        </div>

        {/* Count */}
        <p className="text-[11px] text-zinc-600">{filtered.length} items</p>

        {/* Item list grouped */}
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-xs text-zinc-600">
              {query ? `No items match "${query}"` : "No items in this category"}
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {grouped.map(({ label, items }) => (
              <div key={label}>
                <div className="mb-2 flex items-center gap-2">
                  <span
                    className="text-[10px] font-bold uppercase tracking-[0.12em]"
                    style={{ color: CATEGORY_COLORS[label] }}
                  >
                    {label}
                  </span>
                  <span className="text-[10px] text-zinc-700">({items.length})</span>
                </div>
                <div className="space-y-1">
                  {items.map(item => (
                    <button
                      key={item.slug}
                      onClick={() => setSelected(item)}
                      className={`flex w-full items-center gap-2.5 rounded-xl border px-3 py-2 text-left transition ${
                        selected?.slug === item.slug
                          ? "border-violet-500/40 bg-violet-900/20"
                          : "border-zinc-800/60 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-800/60"
                      }`}
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center">
                        {item.spriteUrl ? (
                          <Image src={item.spriteUrl} alt={item.name} width={28} height={28} unoptimized />
                        ) : (
                          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-800 text-[9px] font-bold text-zinc-600">?</span>
                        )}
                      </div>
                      <span className="flex-1 truncate text-sm font-medium text-zinc-200">{item.name}</span>
                      {item.isChampionsItem && (
                        <span className="shrink-0 text-[10px] text-amber-500">★</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Right: detail panel ─────────────────────────────────────────────── */}
      <div
        className="panel-card sticky top-4 w-[48rem] shrink-0 overflow-y-auto p-5"
        style={{ maxHeight: "calc(100vh - 8rem)" }}
      >
        {selected ? (
          <div className="flex flex-col gap-5">
            {/* Category accent bar */}
            <div className="h-0.5 w-full rounded-full" style={{ background: selectedCategoryColor }} />

            {/* Header */}
            <div className="flex items-center gap-4">
              <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-zinc-800/80">
                {selected.spriteUrl ? (
                  <Image src={selected.spriteUrl} alt={selected.name} width={72} height={72} unoptimized />
                ) : (
                  <span className="text-3xl text-zinc-500">?</span>
                )}
              </div>
              <div className="flex flex-1 flex-col gap-2">
                <h2 className="text-xl font-bold tracking-tight text-white">{selected.name}</h2>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="rounded-lg px-2.5 py-1 text-xs font-bold"
                    style={{
                      color: selectedCategoryColor,
                      background: `${selectedCategoryColor}18`,
                    }}
                  >
                    {selectedCategory}
                  </span>
                  {selected.isChampionsItem && (
                    <span className="rounded-lg bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-400">
                      ★ Champions
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Effect */}
            <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 px-4 py-3">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">Effect</p>
              <p className="text-sm leading-relaxed text-zinc-300">{formatEffect(selected.effect)}</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-dashed border-zinc-800">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-zinc-800">
                <circle cx="10.5" cy="10.5" r="7.5" />
                <path d="m21 21-4.5-4.5" />
              </svg>
            </div>
            <p className="text-xs text-zinc-600">Select an item to view details</p>
          </div>
        )}
      </div>
    </div>
  );
}
