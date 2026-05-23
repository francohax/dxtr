import { useEffect, useRef } from "react";

export interface FocusChainEntry {
  id: string;
  getElement: () => HTMLElement | null;
}

/**
 * Intercepts Tab / Shift+Tab and cycles through the ordered list of element
 * getters. Elements not in the chain are unaffected — the browser handles Tab
 * for them normally. Add new entries to the array to extend the focus order.
 *
 * onFocusChanged is called with the id of the entry that just received focus.
 */
export function useFocusChain(entries: FocusChainEntry[], onFocusChanged?: (id: string) => void) {
  const entriesRef = useRef(entries);
  entriesRef.current = entries;
  const onFocusChangedRef = useRef(onFocusChanged);
  onFocusChangedRef.current = onFocusChanged;

  useEffect(() => {
    function onTab(e: KeyboardEvent) {
      if (e.key !== "Tab") return;
      const chain = entriesRef.current.map(en => ({ id: en.id, el: en.getElement() }));
      const valid = chain.filter((item): item is { id: string; el: HTMLElement } => {
        if (!item.el) return false;
        return !(item.el as HTMLInputElement).disabled;
      });
      const current = document.activeElement as HTMLElement;
      const idx = valid.findIndex(item => item.el === current);
      if (idx === -1) return; // not in our chain — let browser handle normally
      e.preventDefault();
      const nextIdx = e.shiftKey
        ? (idx - 1 + valid.length) % valid.length
        : (idx + 1) % valid.length;
      const next = valid[nextIdx]!;
      next.el.focus();
      onFocusChangedRef.current?.(next.id);
    }
    window.addEventListener("keydown", onTab);
    return () => window.removeEventListener("keydown", onTab);
  }, []); // empty — reads entries and callback live via refs
}
