"use client";

import { useState, useRef, useCallback, type ReactNode } from "react";

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  delay?: number;
  side?: "top" | "bottom" | "left" | "right";
  className?: string;
}

export function Tooltip({ content, children, delay = 500, side = "top", className }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(() => {
    timerRef.current = setTimeout(() => setVisible(true), delay);
  }, [delay]);

  const hide = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(false);
  }, []);

  const posClass =
    side === "top"    ? "bottom-full left-1/2 -translate-x-1/2 mb-2" :
    side === "bottom" ? "top-full  left-1/2 -translate-x-1/2 mt-2" :
    side === "left"   ? "right-full top-1/2 -translate-y-1/2 mr-2" :
                        "left-full  top-1/2 -translate-y-1/2 ml-2";

  const arrowClass =
    side === "top"    ? "top-full left-1/2 -translate-x-1/2 border-l-[5px] border-r-[5px] border-t-[5px] border-l-transparent border-r-transparent border-t-zinc-800" :
    side === "bottom" ? "bottom-full left-1/2 -translate-x-1/2 border-l-[5px] border-r-[5px] border-b-[5px] border-l-transparent border-r-transparent border-b-zinc-800" :
    side === "left"   ? "left-full top-1/2 -translate-y-1/2 border-t-[5px] border-b-[5px] border-l-[5px] border-t-transparent border-b-transparent border-l-zinc-800" :
                        "right-full top-1/2 -translate-y-1/2 border-t-[5px] border-b-[5px] border-r-[5px] border-t-transparent border-b-transparent border-r-zinc-800";

  return (
    <div
      className={`relative ${className ?? ""}`}
      onMouseEnter={show}
      onMouseLeave={hide}
    >
      {children}
      {visible && content != null && (
        <div className={`pointer-events-none absolute z-50 ${posClass}`}>
          <div className="relative w-max max-w-[240px] rounded-xl border border-zinc-700/80 bg-zinc-900 px-3 py-2.5 text-[11px] leading-relaxed text-zinc-300 shadow-2xl">
            {content}
            <div className={`absolute h-0 w-0 ${arrowClass}`} />
          </div>
        </div>
      )}
    </div>
  );
}
