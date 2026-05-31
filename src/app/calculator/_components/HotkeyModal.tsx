"use client";

import { useEffect } from "react";

// ─── Shortcut data ────────────────────────────────────────────────────────────

const SECTIONS = [
  {
    title: "Navigation",
    rows: [
      { keys: ["1", "2"],            desc: "Focus Attacker / Defender slot" },
      { keys: ["Enter"],             desc: "Open Pokémon picker for focused slot" },
      { keys: ["Tab"],               desc: "16-stop cycle: cards → items → natures → move → EVs → stages → weather → terrain → level → crit → burn" },
      { keys: ["K"],                 desc: "Open move picker" },
      { keys: ["Esc"],               desc: "Clear keyboard focus / close modal" },
    ],
  },
  {
    title: "Stat Editing",
    rows: [
      { keys: ["e"],                 desc: "Select EV panel for focused slot" },
      { keys: ["b"],                 desc: "Select Stages (Buffs) panel" },
      { keys: ["a", "↑"],           desc: "Highlight Physical stat (Attack / Defense)" },
      { keys: ["s", "↓"],           desc: "Highlight Special stat (Sp. Atk / Sp. Def)" },
      { keys: ["→", "+"],           desc: "Increase EV (+4) or Stage (+1)" },
      { keys: ["←", "−"],           desc: "Decrease EV (−4) or Stage (−1)" },
    ],
  },
  {
    title: "Weather & Terrain",
    rows: [
      { keys: ["w"],                 desc: "Focus Weather grid, then press 1–4 to set (same key clears)" },
      { keys: ["t"],                 desc: "Focus Terrain grid, then press 1–4 to set (same key clears)" },
      { keys: ["c"],                 desc: "Toggle Critical Hit" },
      { keys: ["v"],                 desc: "Toggle Burn (attacker)" },
      { keys: ["↑", "↓", "←", "→"], desc: "Navigate focused weather / terrain grid" },
      { keys: ["Enter", "Space"],    desc: "Toggle highlighted option" },
    ],
  },
  {
    title: "Search Dropdowns",
    rows: [
      { keys: ["↑", "↓"],           desc: "Move through search results" },
      { keys: ["Enter"],             desc: "Select highlighted result" },
      { keys: ["1–0"],              desc: "Toggle type filter (inside Pokémon picker)" },
    ],
  },
  {
    title: "This cheat sheet",
    rows: [
      { keys: ["/"],                 desc: "Open / close" },
      { keys: ["Esc"],               desc: "Close" },
    ],
  },
];

// ─── Chip ─────────────────────────────────────────────────────────────────────

function KeyChip({ label }: { label: string }) {
  return (
    <kbd className="inline-flex min-w-[1.4rem] items-center justify-center rounded-md border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-zinc-300 shadow-sm">
      {label}
    </kbd>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

interface HotkeyModalProps {
  onClose: () => void;
}

export function HotkeyModal({ onClose }: HotkeyModalProps) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" || e.key === "/") {
        e.preventDefault();
        onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="animate-fade-in relative w-full max-w-2xl overflow-hidden rounded-2xl border border-zinc-700/60 bg-zinc-900 shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800/60 px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-zinc-200">Keyboard Shortcuts</span>
            <KeyChip label="/" />
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-600 transition hover:text-zinc-300"
            aria-label="Close"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="grid grid-cols-2 gap-px bg-zinc-800/40 p-px lg:grid-cols-3">
          {SECTIONS.map(section => (
            <div key={section.title} className="flex flex-col gap-3 bg-zinc-900 p-4">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
                {section.title}
              </span>
              <div className="flex flex-col gap-2.5">
                {section.rows.map(({ keys, desc }) => (
                  <div key={desc} className="flex items-center gap-2">
                    <div className="flex shrink-0 flex-wrap gap-1">
                      {keys.map((k, i) => (
                        <span key={k} className="flex items-center gap-1">
                          <KeyChip label={k} />
                          {i < keys.length - 1 && (
                            <span className="text-[10px] text-zinc-700">/</span>
                          )}
                        </span>
                      ))}
                    </div>
                    <span className="text-[11px] text-zinc-500">{desc}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-800/60 px-5 py-2.5 text-center text-[10px] text-zinc-700">
          Press <KeyChip label="Esc" /> or click outside to close
        </div>

      </div>
    </div>
  );
}
