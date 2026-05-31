"use client";

import { TeamSlotCard } from "./TeamSlotCard";
import { type TeamSlotConfig } from "~/lib/types";

interface TeamSlotListProps {
  slots: (TeamSlotConfig | null)[];
  activeIndex: number;
  onSelectSlot: (index: number) => void;
  onRemoveSlot: (index: number) => void;
}

export function TeamSlotList({ slots, activeIndex, onSelectSlot, onRemoveSlot }: TeamSlotListProps) {
  return (
    <div className="flex w-72 shrink-0 flex-col gap-2">
      <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-zinc-500">
        Team Slots
      </p>
      {slots.map((slot, i) => (
        <TeamSlotCard
          key={i}
          slot={slot}
          slotIndex={i}
          isActive={activeIndex === i}
          onSelect={() => onSelectSlot(i)}
          onRemove={e => {
            e.stopPropagation();
            onRemoveSlot(i);
          }}
        />
      ))}
    </div>
  );
}
