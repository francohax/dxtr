import { useEffect, useRef } from "react";

export interface FocusChainEntry {
  id: string;
  getElement: () => HTMLElement | null;
}

/**
 * Intercepts Tab / Shift+Tab and cycles through the ordered list of element
 * getters. Elements not in the chain are unaffected — the browser handles Tab
 * for them normally. Add new entries to the array to extend the focus order.
 */
export function useFocusChain(entries: FocusChainEntry[]) {
  const entriesRef = useRef(entries);
  entriesRef.current = entries;

  useEffect(() => {
    function onTab(e: KeyboardEvent) {
      if (e.key !== "Tab") return;
      const els = entriesRef.current
        .map(en => en.getElement())
        .filter((el): el is HTMLElement => {
          if (!el) return false;
          return !(el as HTMLInputElement).disabled;
        });
      const current = document.activeElement as HTMLElement;
      const idx = els.indexOf(current);
      if (idx === -1) return; // not in our chain — let browser handle normally
      e.preventDefault();
      const next = e.shiftKey
        ? els[(idx - 1 + els.length) % els.length]!
        : els[(idx + 1) % els.length]!;
      next.focus();
    }
    window.addEventListener("keydown", onTab);
    return () => window.removeEventListener("keydown", onTab);
  }, []); // empty — reads entries live via ref
}
