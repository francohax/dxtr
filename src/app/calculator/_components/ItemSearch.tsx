"use client";

import { useState, useMemo, useRef, useEffect, type ReactNode } from "react";
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

// ─── Component ────────────────────────────────────────────────────────────────

interface ItemSearchProps {
  value: CompetitiveItem | null;
  onChange: (item: CompetitiveItem | null) => void;
  containerRef?: React.RefObject<HTMLInputElement | null>;
}

export function ItemSearch({ value, onChange, containerRef }: ItemSearchProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [championsOnly, setChampionsOnly] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const pool = useMemo(
    () => championsOnly ? COMPETITIVE_ITEMS.filter(i => i.isChampionsItem) : COMPETITIVE_ITEMS,
    [championsOnly],
  );

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return pool.filter(i => i.name.toLowerCase().includes(q)).slice(0, 20);
  }, [query, pool]);

  if (value) {
    return (
      <Tooltip content={effectTooltip(value)} side="bottom">
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
      </Tooltip>
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
}
