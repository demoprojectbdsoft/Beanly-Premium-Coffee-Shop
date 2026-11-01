"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * A wizard draft that survives a refresh, a closed tab or a mid-application
 * sign-out.
 *
 * The value is written to `localStorage` under `storageKey` on every change,
 * debounced so a fast typist never thrashes the disk, and cleared by
 * `clearDraft()` once the application is actually submitted. The server still
 * owns the real record — this only saves the person from retyping six steps
 * because their browser refreshed.
 *
 * A draft is loaded once on mount and only when `enabled` is true, so a
 * returning applicant whose earlier answers come from the API is never
 * overwritten by a stale local copy. When the two disagree the caller decides
 * which wins by passing the appropriate `initial` and `enabled` values.
 */

export interface UseWizardDraft<T> {
  draft: T;
  patch: (updater: (current: T) => T) => void;
  clearDraft: () => void;
  restored: boolean;
}

export function useWizardDraft<T>(
  storageKey: string,
  initial: T,
  options: { enabled?: boolean } = {}
): UseWizardDraft<T> {
  const { enabled = true } = options;
  const [draft, setDraft] = useState<T>(initial);
  const [restored, setRestored] = useState(false);
  const loadedRef = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Hydrate once from localStorage on mount, then defer to the caller.
  useEffect(() => {
    if (loadedRef.current || !enabled || typeof window === "undefined") return;
    loadedRef.current = true;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as T;
        // Merge over `initial` so any new field added since the draft was
        // saved still arrives with its default rather than `undefined`.
        // Reading an external store (localStorage) and syncing it into state
        // exactly once on mount is the sanctioned use of an effect.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setDraft({ ...(initial as object), ...(parsed as object) } as T);
        setRestored(true);
      }
    } catch {
      // A corrupted draft should not break the form — start fresh.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, storageKey]);

  // Persist on change, debounced. Skipped before hydration and when disabled.
  useEffect(() => {
    if (!enabled || !loadedRef.current) return;
    if (typeof window === "undefined") return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(draft));
      } catch {
        // Private browsing or a full disk should not block typing.
      }
    }, 400);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [draft, enabled, storageKey]);

  const patch = useCallback((updater: (current: T) => T) => {
    setDraft((current) => updater(current));
  }, []);

  const clearDraft = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      // Nothing to clean up if the write path also failed.
    }
  }, [storageKey]);

  return { draft, patch, clearDraft, restored };
}
