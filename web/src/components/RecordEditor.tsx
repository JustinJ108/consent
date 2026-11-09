"use client";

import { useState } from "react";
import type { Category } from "@/lib/types";

const PLACEHOLDERS: Record<Category, string> = {
  contact: '{\n  "phone": "555-0148",\n  "email": "client@example.com"\n}',
  housing: '{\n  "status": "temporary",\n  "notes": "Staying at Riverside shelter"\n}',
  health: '{\n  "conditions": ["asthma"],\n  "medications": []\n}',
  financial: '{\n  "income": 1200,\n  "benefits": ["SNAP"]\n}',
  legal: '{\n  "openCases": [],\n  "notes": ""\n}',
  other: '{\n  "notes": ""\n}',
};

function toText(value: Record<string, unknown> | undefined): string {
  return value ? JSON.stringify(value, null, 2) : "";
}

export function RecordEditor({
  category,
  initial,
  onSave,
}: {
  category: Category;
  initial: Record<string, unknown> | undefined;
  onSave: (category: Category, data: Record<string, unknown>) => Promise<void>;
}) {
  const [text, setText] = useState(() => toText(initial));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setError(null);
    setSaved(false);

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch (err) {
      setError(err instanceof Error ? `Invalid JSON: ${err.message}` : "Invalid JSON");
      return;
    }

    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      setError("Each category record must be a JSON object.");
      return;
    }

    setSaving(true);
    try {
      await onSave(category, parsed as Record<string, unknown>);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <textarea
        spellCheck={false}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={PLACEHOLDERS[category]}
        className="h-48 w-full resize-y rounded-lg border border-zinc-300 bg-white p-3 font-mono text-xs leading-relaxed outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-950"
      />
      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-xs font-medium text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={() => {
            setText(toText(initial));
            setError(null);
          }}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Reset
        </button>
        {saved && (
          <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
            Saved
          </span>
        )}
      </div>
    </div>
  );
}
