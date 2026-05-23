import { useState, useEffect, useRef } from "react";

export interface UseListKeyboardOptions {
  count:     number;
  onConfirm: (index: number) => void;
  onEscape?: () => void;
  enabled?:  boolean;
}

/**
 * Tracks a highlighted index (-1 = nothing) within a dropdown list.
 * ArrowDown/Up moves the index; Enter confirms the highlighted item;
 * Escape resets to -1 and calls onEscape.
 */
export function useListKeyboard({ count, onConfirm, onEscape, enabled = true }: UseListKeyboardOptions) {
  const [activeIndex, setActiveIndex] = useState(-1);

  // Reset to first item whenever the list changes
  useEffect(() => { setActiveIndex(count > 0 ? 0 : -1); }, [count]);

  const activeRef = useRef(activeIndex);
  activeRef.current = activeIndex;
  const cbRef = useRef({ onConfirm, onEscape });
  cbRef.current = { onConfirm, onEscape };

  useEffect(() => {
    if (!enabled) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex(prev => (count > 0 ? Math.min(prev + 1, count - 1) : -1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex(prev => Math.max(prev - 1, -1));
        return;
      }
      if (e.key === "Enter" && activeRef.current >= 0) {
        e.preventDefault();
        cbRef.current.onConfirm(activeRef.current);
        return;
      }
      if (e.key === "Escape") {
        setActiveIndex(-1);
        cbRef.current.onEscape?.();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [count, enabled]);

  return { activeIndex, setActiveIndex };
}
