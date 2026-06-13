"use client";

import { useState, useMemo, useRef, useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { COMPETITIVE_ITEMS, type CompetitiveItem, type ItemEffect } from "~/lib/items";
import { Tooltip } from "./Tooltip";

// ─── Tooltip content per item effect ─────────────────────────────────────────

function effectTooltip(item: CompetitiveItem): ReactNode {
  const e: ItemEffect = item.effect;
  switch (e.type) {
    case "attack_mult":
      return (
        <div className="flex flex-col gap-1">
          <span className="font-semibold text-zinc-100">{item.name}</span>
          <span>
            {e.category === "physical" ? "Physical" : e.category === "special" ? "Special" : "All"} Attack{" "}
            <span className="font-medium text-green-300">×{e.mult}</span>
          </span>
          <span className="text-zinc-500 text-[10px]">Locks the holder into the last used move.</span>
        </div>
      );
    case "damage_mult":
      return (
        <div className="flex flex-col gap-1">
          <span className="font-semibold text-zinc-100">{item.name}</span>
          <span>
            Final damage{" "}
            <span className="font-medium text-green-300">×{e.mult}</span>
            {e.superEffectiveOnly ? " (super effective only)" : ""}
          </span>
          {!e.superEffectiveOnly && (
            <span className="text-zinc-500 text-[10px]">Holder loses 1/10 max HP per use.</span>
          )}
          {e.superEffectiveOnly && (
            <span className="text-zinc-500 text-[10px]">No recoil. Only activates when type effectiveness {">"} 1×.</span>
          )}
        </div>
      );
    case "defense_mult":
      return (
        <div className="flex flex-col gap-1">
          <span className="font-semibold text-zinc-100">{item.name}</span>
          <span>
            Special Defense <span className="font-medium text-blue-300">×{e.mult}</span>
          </span>
          <span className="text-zinc-500 text-[10px]">Holder cannot use status moves.</span>
        </div>
      );
    case "type_boost":
      return (
        <div className="flex flex-col gap-1">
          <span className="font-semibold text-zinc-100">{item.name}</span>
          <span>
            <span className="capitalize">{e.poketype}</span>-type moves{" "}
            <span className="font-medium text-green-300">×{e.mult}</span>
          </span>
          <span className="text-zinc-500 text-[10px]">Applied after all other modifiers.</span>
        </div>
      );
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
    default:
      return <span className="font-semibold text-zinc-100">{item.name}</span>;
  }
}

// ─── Category helpers ─────────────────────────────────────────────────────────

const CATEGORY_ORDER = ["Type Boosters", "Hold Items", "Berries", "Mega Stones", "Tickets"] as const;
type ItemCategory = (typeof CATEGORY_ORDER)[number];

function getItemCategory(item: CompetitiveItem): ItemCategory {
  const name = item.name.toLowerCase();
  const slug = item.slug;
  if (name.includes("ticket") || name.includes("coupon")) return "Tickets";
  if (slug.endsWith("ite") || slug === "charizardite-x" || slug === "charizardite-y") return "Mega Stones";
  if (slug.endsWith("-berry")) return "Berries";
  if (item.effect.type === "type_boost") return "Type Boosters";
  return "Hold Items";
}

// ─── Shared item row ──────────────────────────────────────────────────────────

function ItemRow({
  item,
  onSelect,
}: {
  item: CompetitiveItem;
  onSelect: (item: CompetitiveItem) => void;
}) {
  return (
    <Tooltip content={effectTooltip(item)} side="right" className="w-full">
      <button
        onClick={() => onSelect(item)}
        className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-xs transition hover:bg-zinc-800/70"
      >
        {item.spriteUrl ? (
          <Image src={item.spriteUrl} alt={item.name} width={28} height={28} className="shrink-0" />
        ) : (
          <span className="h-4 w-4 shrink-0 rounded-sm bg-zinc-800 text-[8px] leading-4 text-center text-zinc-600">?</span>
        )}
        <span className="flex-1 truncate text-zinc-300">{item.name}</span>
        {item.effect.type !== "none" && (
          <span className="shrink-0 text-[9px] text-zinc-600">
            {item.effect.type === "type_boost" && `×${item.effect.mult}`}
            {item.effect.type === "attack_mult" && `×${item.effect.mult} Atk`}
            {item.effect.type === "damage_mult" && `×${item.effect.mult} dmg`}
            {item.effect.type === "defense_mult" && `×${item.effect.mult} Def`}
            {item.effect.type === "type_resist_berry" && `×${item.effect.mult}`}
          </span>
        )}
      </button>
    </Tooltip>
  );
}

// ─── Item Picker Modal ────────────────────────────────────────────────────────

function ItemPickerModal({
  onSelect,
  onClose,
}: {
  onSelect: (item: CompetitiveItem) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [championsOnly, setChampionsOnly] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    function handle(e: KeyboardEvent) {
      if (e.key === "Escape") onCloseRef.current();
    }
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, []);

  const pool = useMemo(
    () => (championsOnly ? COMPETITIVE_ITEMS.filter(i => i.isChampionsItem) : COMPETITIVE_ITEMS),
    [championsOnly],
  );

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    const matches = pool.filter(i => i.name.toLowerCase().includes(q));
    return championsOnly && !query ? matches : matches.slice(0, 30);
  }, [query, pool, championsOnly]);

  const grouped = useMemo(() => {
    if (!championsOnly || query) return null;
    const map = new Map<ItemCategory, CompetitiveItem[]>();
    for (const item of filtered) {
      const cat = getItemCategory(item);
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(item);
    }
    return CATEGORY_ORDER.filter(c => map.has(c)).map(c => ({ label: c, items: map.get(c)! }));
  }, [filtered, championsOnly, query]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="animate-fade-in flex h-[min(80vh,520px)] w-full max-w-sm flex-col overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-950 shadow-2xl">

        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-zinc-800/60 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">Held Item</span>
            {filtered.length > 0 && (
              <span className="rounded-full bg-zinc-800 px-1.5 py-px text-[9px] tabular-nums text-zinc-500">
                {filtered.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
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
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-zinc-800 hover:text-zinc-200"
              aria-label="Close"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="shrink-0 px-4 py-3">
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search items…"
            className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-600 outline-none transition focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30"
          />
        </div>

        {/* List */}
        {filtered.length > 0 ? (
          <div className="flex-1 overflow-y-auto py-1">
            {grouped ? (
              grouped.map(({ label, items }) => (
                <div key={label}>
                  <div className="sticky top-0 flex items-center gap-2 bg-zinc-950 px-3 py-1.5">
                    <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-zinc-600">{label}</span>
                    <span className="text-[9px] text-zinc-700">({items.length})</span>
                  </div>
                  {items.map(item => (
                    <ItemRow key={item.slug} item={item} onSelect={onSelect} />
                  ))}
                </div>
              ))
            ) : (
              filtered.map(item => (
                <ItemRow key={item.slug} item={item} onSelect={onSelect} />
              ))
            )}
          </div>
        ) : (
          <p className="flex-1 px-3 py-8 text-center text-[11px] text-zinc-600">
            {championsOnly
              ? `No Champions items match "${query}".`
              : `No items matching "${query}".`}
          </p>
        )}

      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

interface ItemSearchProps {
  value: CompetitiveItem | null;
  onChange: (item: CompetitiveItem | null) => void;
  containerRef?: React.RefObject<HTMLInputElement | null>;
}

export function ItemSearch({ value, onChange }: ItemSearchProps) {
  const [open, setOpen] = useState(false);

  function handleSelect(item: CompetitiveItem) {
    onChange(item);
    setOpen(false);
  }

  return (
    <>
      {value ? (
        <Tooltip content={effectTooltip(value)} side="bottom">
          <div
            onClick={() => setOpen(true)}
            className="group flex cursor-pointer items-center gap-2.5 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 transition hover:border-zinc-500"
          >
            {value.spriteUrl ? (
              <Image src={value.spriteUrl} alt={value.name} width={28} height={28} className="shrink-0" unoptimized />
            ) : (
              <span className="h-5 w-5 shrink-0 rounded-sm bg-zinc-800 text-[8px] leading-5 text-center text-zinc-600">?</span>
            )}
            <span className="min-w-0 flex-1 truncate text-xs text-zinc-300">{value.name}</span>
            <button
              onClick={e => { e.stopPropagation(); onChange(null); }}
              className="shrink-0 text-zinc-600 transition hover:text-red-400"
              aria-label="Remove item"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </Tooltip>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="flex w-full items-center gap-2 rounded-xl border border-dashed border-zinc-700 bg-zinc-900/40 px-3 py-2 text-xs text-zinc-600 transition hover:border-zinc-500 hover:text-zinc-400"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add item
        </button>
      )}

      {open && createPortal(
        <ItemPickerModal onSelect={handleSelect} onClose={() => setOpen(false)} />,
        document.body,
      )}
    </>
  );
}
