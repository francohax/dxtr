"use client";

import { NaturePicker } from "~/app/_components/NaturePicker";
import type { NatureKey } from "~/lib/natures";

interface NatureSelectProps {
  value: NatureKey;
  onChange: (nature: NatureKey) => void;
  buttonRef?: React.RefObject<HTMLButtonElement | null>;
}

export function NatureSelect({ value, onChange, buttonRef }: NatureSelectProps) {
  return (
    <NaturePicker
      value={value}
      onChange={n => onChange(n as NatureKey)}
      buttonRef={buttonRef}
    />
  );
}
