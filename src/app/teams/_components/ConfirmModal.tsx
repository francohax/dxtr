"use client";

import { type ReactNode } from "react";
import { Button } from "~/app/_components/Button";

interface ConfirmAction {
  label: string;
  variant: "primary" | "secondary" | "danger" | "ghost";
  onClick: () => void;
}

interface ConfirmModalProps {
  title: string;
  message: ReactNode;
  actions: ConfirmAction[];
}

export function ConfirmModal({ title, message, actions }: ConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="animate-scale-in w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
        <h2 className="mb-2 text-base font-bold text-white">{title}</h2>
        <div className="mb-5 text-sm text-zinc-400">{message}</div>
        <div className="flex flex-col gap-2">
          {actions.map(action => (
            <Button
              key={action.label}
              variant={action.variant}
              size="md"
              className="w-full"
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
