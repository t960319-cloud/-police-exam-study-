"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { applyLegalEvents, type SavedLegalEvent } from "./legal-updates";
import type { Essay, Law, Question } from "./study-data";

const KEY = "police-legal-updates-v1";
export function useLegalUpdates(questions: Question[], essays: Essay[], laws: Law[]) {
  const [events, setEvents] = useState<SavedLegalEvent[]>([]);
  const [latestCheck, setLatestCheck] = useState<SavedLegalEvent | null>(null);
  const [status, setStatus] = useState<"loading" | "synced" | "offline">("loading");
  const request = useRef<AbortController | null>(null);
  const refresh = useCallback(async () => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    try {
      const all: SavedLegalEvent[] = [];
      const cursors = new Set<string>();
      let cursor: string | null = null;
      let check: SavedLegalEvent | null = null;
      do {
        const response: Response = await fetch(`/api/legal-updates${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`, { cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error("read failed");
        const data: { events: SavedLegalEvent[]; latestCheck: SavedLegalEvent | null; nextCursor: string | null } = await response.json();
        if (!Array.isArray(data.events)) throw new Error("invalid events");
        all.push(...data.events);
        check = data.latestCheck;
        cursor = data.nextCursor;
        if (cursor && cursors.has(cursor)) throw new Error("repeated cursor");
        if (cursor) cursors.add(cursor);
      } while (cursor);
      if (controller.signal.aborted) return;
      setEvents(all); setLatestCheck(check); setStatus("synced");
      try { localStorage.setItem(KEY, JSON.stringify({ events: all, latestCheck: check })); }
      catch { /* The current server response remains usable. */ }
    } catch { if (!controller.signal.aborted) setStatus("offline"); }
  }, []);
  useEffect(() => {
    // Initialize browser-only cache after hydration, before the first network refresh.
    const initialize = requestAnimationFrame(() => {
      try {
        const cache = JSON.parse(localStorage.getItem(KEY) || "null");
        if (Array.isArray(cache?.events)) { setEvents(cache.events); setLatestCheck(cache.latestCheck ?? null); }
      } catch { /* Ignore a damaged cache and request the server version. */ }
      void refresh();
    });
    const visible = () => { if (document.visibilityState === "visible") void refresh(); };
    document.addEventListener("visibilitychange", visible);
    window.addEventListener("online", refresh);
    const timer = setInterval(() => void refresh(), 300_000);
    return () => {
      cancelAnimationFrame(initialize);
      request.current?.abort();
      document.removeEventListener("visibilitychange", visible);
      window.removeEventListener("online", refresh);
      clearInterval(timer);
    };
  }, [refresh]);
  const content = useMemo(() => applyLegalEvents(questions, essays, events, laws), [questions, essays, events, laws]);
  return { ...content, events, latestCheck, status, refresh };
}
