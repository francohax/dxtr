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
