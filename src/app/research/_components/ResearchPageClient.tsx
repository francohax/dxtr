"use client";

import { useState } from "react";
import { PokemonTab } from "./PokemonTab";
import { MovesTab } from "./MovesTab";
import { ItemsTab } from "./ItemsTab";
import { TrainingTab } from "./TrainingTab";

type TabId = "pokemon" | "moves" | "items" | "training";

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  {
    id: "pokemon",
    label: "Pokémon",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <circle cx="12" cy="12" r="3" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: "moves",
    label: "Moves",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
    ),
  },
  {
    id: "items",
    label: "Items",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <path d="M16 10a4 4 0 0 1-8 0" />
      </svg>
    ),
  },
  {
    id: "training",
    label: "Training",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
];

export function ResearchPageClient() {
  const [activeTab, setActiveTab] = useState<TabId>("pokemon");

  return (
    <div className="flex flex-col gap-4">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">Research Hub</h1>
          <p className="mt-0.5 text-xs text-zinc-500">Look up Pokémon, moves, items, and training strategies</p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 rounded-xl border border-zinc-800 bg-zinc-900/60 p-1">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-150 ${
              activeTab === tab.id
                ? "bg-violet-500/20 text-violet-300 shadow-sm"
                : "text-zinc-500 hover:bg-zinc-800/60 hover:text-zinc-300"
            }`}
          >
            <span className="shrink-0">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="min-h-0 flex-1">
        {activeTab === "pokemon"  && <PokemonTab />}
        {activeTab === "moves"    && <MovesTab />}
        {activeTab === "items"    && <ItemsTab />}
        {activeTab === "training" && <TrainingTab />}
      </div>
    </div>
  );
}
