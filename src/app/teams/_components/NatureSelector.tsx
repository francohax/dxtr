"use client";

import { NaturePicker } from "~/app/_components/NaturePicker";

interface NatureSelectorProps {
  value: string;
  onChange: (nature: string) => void;
}

export function NatureSelector({ value, onChange }: NatureSelectorProps) {
  return (
    <div className="flex flex-col gap-1">
      <label className="section-label">Nature</label>
      <NaturePicker value={value} onChange={onChange} />
    </div>
  );
}
