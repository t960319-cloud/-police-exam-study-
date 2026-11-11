"use client";
import { useCallback, useEffect, useRef, useState } from "react";

export type RecordEntry = { value: any; updatedAt: number };
export type StudyRecords = Record<string, RecordEntry>;
const CACHE_KEY = "police-study-records-v1";
const QUEUE_KEY = "police-study-pending-v1";

export function useStudyStore() {
  const [records, setRecords] = useState<StudyRecords>({});
  const [sync, setSync] = useState<"loading" | "synced" | "offline" | "saving">("loading");
  const [ready, setReady] = useState(false);
  const state = useRef<StudyRecords>({});
  const pending = useRef<StudyRecords>({});
  const busy = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const storageFailed = useRef(false);
  const persist = useCallback(() => {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(state.current)); localStorage.setItem(QUEUE_KEY, JSON.stringify(pending.current)); storageFailed.current = false; }
    catch { storageFailed.current = true; }
  }, []);
  const flush = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      if (Object.keys(pending.current).length) setSync("saving");
      while (Object.keys(pending.current).length) {
        const [key, record] = Object.entries(pending.current)[0];
        const res = await fetch("/api/records", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key, ...record }) });
        if (!res.ok) throw new Error("save failed");
        const { record: server } = await res.json() as { record: RecordEntry };
        if (pending.current[key]?.updatedAt === record.updatedAt) delete pending.current[key];
        if (server && server.updatedAt > (state.current[key]?.updatedAt ?? 0)) state.current[key] = server;
        persist();
      }
      setRecords({ ...state.current });
      setSync("synced");
    } catch { setSync("offline"); }
    finally { busy.current = false; }
  }, [persist]);
  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/records", { cache: "no-store" });
      if (!res.ok) throw new Error("read failed");
      const data = await res.json() as { records: StudyRecords };
      for (const [key, entry] of Object.entries(data.records ?? {}) as [string, RecordEntry][]) {
        if (entry.updatedAt > (state.current[key]?.updatedAt ?? 0)) state.current[key] = entry;
      }
      setRecords({ ...state.current }); persist(); setSync("synced");
      await flush();
    } catch { setSync("offline"); }
  }, [flush, persist]);
  useEffect(() => {
    try { state.current = JSON.parse(localStorage.getItem(CACHE_KEY) || "{}"); pending.current = JSON.parse(localStorage.getItem(QUEUE_KEY) || "{}"); } catch { state.current = {}; pending.current = {}; }
    setRecords({ ...state.current }); setReady(true); void refresh();
    const id = window.setInterval(() => { if (Object.keys(pending.current).length) void flush(); }, 15_000);
    const onVisible = () => { if (document.visibilityState === "visible") void refresh(); };
    const onStorage = (event: StorageEvent) => {
      if (event.key !== CACHE_KEY || !event.newValue) return;
      try {
        const incoming = JSON.parse(event.newValue) as StudyRecords;
        for (const [key, entry] of Object.entries(incoming)) {
          if (entry.updatedAt > (state.current[key]?.updatedAt ?? 0)) state.current[key] = entry;
        }
        setRecords({ ...state.current });
      } catch { /* A damaged cache never replaces the current records. */ }
    };
    window.addEventListener("online", refresh); document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("storage", onStorage);
    return () => { clearInterval(id); window.removeEventListener("online", refresh); document.removeEventListener("visibilitychange", onVisible); window.removeEventListener("storage", onStorage); if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [flush, refresh]);
  const put = useCallback((key: string, value: any) => {
    const entry = { value, updatedAt: Math.max(Date.now(), (state.current[key]?.updatedAt ?? 0) + 1) };
    state.current = { ...state.current, [key]: entry }; pending.current[key] = entry;
    setRecords(state.current); persist(); setSync("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => { void flush(); }, 450);
  }, [flush, persist]);
  const read = <T,>(key: string, fallback: T): T => state.current[key]?.value ?? fallback;
  return { records, put, read, sync, ready, refresh, storageFailed: storageFailed.current };
}
