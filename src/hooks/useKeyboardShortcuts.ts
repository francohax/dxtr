import { useEffect } from "react";

type ShortcutMap = {
  /** Fired by Enter when focus is NOT in an input, OR by Ctrl+Enter anywhere */
  onSubmit?: () => void;
  /** Fired by K when focus is NOT in an input */
  onSearch?: () => void;
};

function isInputFocused(): boolean {
  const el = document.activeElement;
  if (!el) return false;
  return (
    el.tagName === "INPUT" ||
    el.tagName === "SELECT" ||
    el.tagName === "TEXTAREA" ||
    (el as HTMLElement).isContentEditable
  );
}

export function useKeyboardShortcuts({ onSubmit, onSearch }: ShortcutMap) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.code === "KeyK" && !e.ctrlKey && !e.metaKey && !e.altKey && !isInputFocused()) {
        e.preventDefault();
        onSearch?.();
        return;
      }

      if (e.key === "Enter") {
        if (e.ctrlKey) {
          e.preventDefault();
          onSubmit?.();
          return;
        }
        if (!isInputFocused()) {
          e.preventDefault();
          onSubmit?.();
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onSubmit, onSearch]);
}
