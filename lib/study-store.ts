"use client";
import { useState, useSyncExternalStore } from "react";
import { createStudyStore } from "./study-sync";
export type { RecordEntry, StudyRecords } from "./study-records";

export function useStudyStore() {
  const [store] = useState(() => createStudyStore());
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
  return { ...snapshot, read: store.read, put: store.put, refresh: store.refresh, importRecords: store.importRecords, resolveConflict: store.resolveConflict, loadHistory: store.loadHistory, legacyRecords: store.legacyRecords, lock: store.lock };
}
