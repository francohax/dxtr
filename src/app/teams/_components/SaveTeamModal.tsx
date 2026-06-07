"use client";

import { useState } from "react";
import { Button } from "~/app/_components/Button";

interface SaveTeamModalProps {
  onSave: (name: string) => void;
  onClose: () => void;
  isSaving: boolean;
  initialName?: string;
  isUpdate?: boolean;
}

export function SaveTeamModal({ onSave, onClose, isSaving, initialName = "", isUpdate = false }: SaveTeamModalProps) {
  const [name, setName] = useState(initialName);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="animate-scale-in w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
        <h2 className="mb-1 text-lg font-bold">{isUpdate ? "Update Team" : "Save Team"}</h2>
        {isUpdate && (
          <p className="mb-3 text-xs text-zinc-500">Changes will overwrite the saved version.</p>
        )}
        <input
          autoFocus
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && name.trim()) onSave(name); }}
          placeholder="Team name…"
          maxLength={60}
          className="mb-4 mt-3 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm text-white outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
        />
        <div className="flex gap-2">
          <Button variant="ghost" size="md" type="button" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            type="button"
            className="flex-1"
            onClick={() => onSave(name)}
            disabled={!name.trim() || isSaving}
          >
            {isSaving ? "Saving…" : isUpdate ? "Update" : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}
