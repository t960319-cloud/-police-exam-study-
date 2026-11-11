import { CACHE_KEY, QUEUE_KEY, isObject, parseRecords, scopedKeys, validBackupEntry, type StudyRecords, type RecordEntry, type RecordConflict, type StudyUser } from "./study-records";

type Queued = RecordEntry & { baseUpdatedAt: number | null };
type Snapshot = {
  records: StudyRecords; sync: "loading" | "synced" | "offline" | "saving";
  ready: boolean; storageFailed: boolean; user: StudyUser | null;
  conflicts: Record<string, RecordConflict>; legacyAvailable: boolean;
};
type Options = { storage?: Storage; request?: typeof fetch; now?: () => number };
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const serial = (value: object) => JSON.stringify(Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b))));

export function createStudyStore(options: Options = {}) {
  const initial: Snapshot = { records: {}, sync: "loading", ready: false, storageFailed: false, user: null, conflicts: {}, legacyAvailable: false };
  let snapshot = initial;
  let records: StudyRecords = {};
  let pending: Record<string, Queued> = {};
  let bases: Record<string, number | null> = {};
  let history: Record<string, RecordEntry[]> = {};
  let conflicts: Record<string, RecordConflict> = {};
  let activeId: string | null | undefined;
  let epoch = 0;
  const acknowledged: Record<string, number> = {};
  const listeners = new Set<() => void>();
  let running: Promise<void> | null = null;
  let refreshAgain = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const now = options.now ?? Date.now;
  const request: typeof fetch = (...args) => (options.request ?? fetch)(...args);
  const storage = () => options.storage ?? window.localStorage;
  const keys = () => scopedKeys(activeId ?? null);
  function publish(patch: Partial<Snapshot> = {}) {
    snapshot = { ...snapshot, ...patch, records: { ...records }, conflicts: { ...conflicts } };
    listeners.forEach(listener => listener());
  }
  function readJSON(key: string): unknown {
    try { return JSON.parse(storage().getItem(key) ?? "null"); } catch { return null; }
  }
  function remember(key: string, record: RecordEntry | undefined) {
    if (!record) return;
    const list = history[key] ?? [];
    if (!list.some(r => r.updatedAt === record.updatedAt && same(r.value, record.value))) history[key] = [record, ...list].slice(0, 20);
  }
  function mergeDisk() {
    const disk = parseRecords(readJSON(keys().cache));
    for (const [key, entry] of Object.entries(disk)) if (entry.updatedAt > (records[key]?.updatedAt ?? 0) && !pending[key] && entry.updatedAt > (acknowledged[key] ?? 0)) records[key] = entry;
    const queue = readJSON(keys().queue);
    if (isObject(queue)) for (const [key, entry] of Object.entries(queue)) {
      const base = isObject(entry) ? entry.baseUpdatedAt : undefined;
      if (!validBackupEntry(key, entry) || !(base === null || Number.isSafeInteger(base))) continue;
      if (entry.updatedAt > (acknowledged[key] ?? 0) && entry.updatedAt > (pending[key]?.updatedAt ?? 0)) {
        pending[key] = entry as Queued;
        records[key] = entry;
      }
    }
    const diskHistory = readJSON(keys().history);
    if (isObject(diskHistory)) for (const [key, entries] of Object.entries(diskHistory)) {
      if (Array.isArray(entries)) for (const entry of entries) if (validBackupEntry(key, entry)) remember(key, entry);
    }
  }
  function persist() {
    if (activeId === undefined) return;
    try {
      mergeDisk();
      storage().setItem(keys().cache, serial(records));
      storage().setItem(keys().queue, serial(pending));
      storage().setItem(keys().base, serial(bases));
      storage().setItem(keys().history, serial(history));
      storage().setItem(keys().conflicts, serial(conflicts));
      snapshot = { ...snapshot, storageFailed: false };
    } catch { snapshot = { ...snapshot, storageFailed: true }; }
  }
  function activate(user: StudyUser | null) {
    const id = user?.userId ?? null;
    if (activeId === id) { snapshot = { ...snapshot, user }; return; }
    epoch++;
    activeId = id;
    records = {}; pending = {}; bases = {}; history = {}; conflicts = {};
    for (const key of Object.keys(acknowledged)) delete acknowledged[key];
    const storedBases = readJSON(keys().base);
    if (isObject(storedBases)) for (const [key, value] of Object.entries(storedBases)) if (value === null || Number.isSafeInteger(value)) bases[key] = value as number | null;
    mergeDisk();
    const storedConflicts = readJSON(keys().conflicts);
    if (isObject(storedConflicts)) for (const [key, value] of Object.entries(storedConflicts)) {
      if (isObject(value) && validBackupEntry(key, value.local) && (value.remote === null || validBackupEntry(key, value.remote)) && pending[key]) conflicts[key] = { local: pending[key], remote: value.remote as RecordEntry | null };
    }
    const legacyAvailable = Object.keys(parseRecords(readJSON(CACHE_KEY))).length > 0 || Object.keys(parseRecords(readJSON(QUEUE_KEY))).length > 0;
    persist();
    publish({ user, ready: true, sync: "loading", legacyAvailable });
  }
  function lock() {
    persist(); epoch++; activeId = undefined;
    records = {}; pending = {}; bases = {}; history = {}; conflicts = {};
    clearTimeout(timer);
    publish({ user: null, ready: false, sync: "loading" });
  }
  async function identify() {
    const generation = epoch;
    const response = await request("/api/session", { cache: "no-store", signal: AbortSignal.timeout(15_000) });
    const data: unknown = await response.json();
    if (generation !== epoch) return false;
    if (!response.ok || !isObject(data)) throw new Error("session unavailable");
    const user = data.user;
    if (user !== null && (!isObject(user) || typeof user.userId !== "string" || !user.userId || typeof user.displayName !== "string" || !["account", "development"].includes(String(user.mode)))) throw new Error("invalid session");
    activate(user as StudyUser | null);
    return true;
  }
  function accountHeaders() { return { "X-Study-User": activeId as string }; }
  function markConflict(key: string, remote: RecordEntry | null) {
    const local = pending[key];
    if (!local) return;
    conflicts[key] = { local: { value: local.value, updatedAt: local.updatedAt }, remote };
    remember(key, remote ?? undefined);
  }
  function accept(key: string, entry: RecordEntry, submitted?: Queued) {
    remember(key, records[key]);
    bases[key] = entry.updatedAt;
    acknowledged[key] = Math.max(acknowledged[key] ?? 0, submitted?.updatedAt ?? entry.updatedAt);
    if (submitted && pending[key]?.updatedAt !== submitted.updatedAt) {
      pending[key] = { ...pending[key], baseUpdatedAt: entry.updatedAt };
    } else { delete pending[key]; delete conflicts[key]; records[key] = entry; }
  }
  async function synchronize() {
    let accountRetries = 0;
    try {
      do {
        refreshAgain = false;
        if (!await identify()) return;
        if (activeId === null) { publish({ sync: "offline" }); return; }
        const generation = epoch;
        const response = await request("/api/records", { cache: "no-store", headers: accountHeaders(), signal: AbortSignal.timeout(15_000) });
        if (generation !== epoch) return;
        if (response.status === 401 || response.status === 409) { lock(); if (++accountRetries > 2) throw new Error("Unstable session"); refreshAgain = true; continue; }
        if (!response.ok) throw new Error("read failed");
        const data: unknown = await response.json();
        if (generation !== epoch) return;
        if (!isObject(data) || data.userId !== activeId || !isObject(data.records)) throw new Error("invalid records");
        const remote = parseRecords(data.records);
        mergeDisk();
        for (const [key, entry] of Object.entries(remote)) {
          if (pending[key]) {
            if (same(entry.value, pending[key].value) && entry.updatedAt >= pending[key].updatedAt) accept(key, entry, pending[key]);
            else if (entry.updatedAt !== pending[key].baseUpdatedAt) markConflict(key, entry);
          } else { remember(key, records[key]); records[key] = entry; bases[key] = entry.updatedAt; }
        }
        for (const [key, item] of Object.entries(pending)) if (!remote[key] && item.baseUpdatedAt !== null) markConflict(key, null);
        persist(); publish({ sync: "saving" });
        while (true) {
          const next = Object.entries(pending).find(([key]) => !conflicts[key]);
          if (!next) break;
          const [key, record] = next;
          const response = await request("/api/records", { method: "PUT", headers: { ...accountHeaders(), "Content-Type": "application/json" }, body: JSON.stringify({ key, ...record }), signal: AbortSignal.timeout(15_000) });
          if (generation !== epoch) return;
          const data: unknown = await response.json();
          if (generation !== epoch) return;
          if (response.status === 401 || (isObject(data) && data.code === "account_changed")) { lock(); if (++accountRetries > 2) throw new Error("Unstable session"); refreshAgain = true; break; }
          if (response.status === 409 && isObject(data) && data.userId === activeId && data.code === "conflict" && (data.record === null || validBackupEntry(key, data.record))) {
            markConflict(key, data.record as RecordEntry | null);
          } else {
            if (!response.ok || !isObject(data) || data.userId !== activeId || !validBackupEntry(key, data.record)) throw new Error("save failed");
            accept(key, data.record, record);
          }
          persist(); publish();
        }
      } while (refreshAgain);
      publish({ sync: Object.keys(pending).length ? "offline" : "synced" });
    } catch { publish({ sync: "offline", ready: true }); }
  }
  function refresh(): Promise<void> {
    if (running) { refreshAgain = true; return running; }
    running = synchronize().finally(() => { running = null; });
    return running;
  }
  function schedule() {
    persist(); publish({ sync: "saving" });
    clearTimeout(timer); timer = setTimeout(() => { void refresh(); }, 450);
  }
  function put(key: string, value: unknown) {
    // Unidentified/anonymous work stays in a separate local scope; never attach it to a later login automatically.
    if (activeId === undefined) activate(null);
    mergeDisk();
    const entry = { value, updatedAt: Math.max(now(), (records[key]?.updatedAt ?? 0) + 1) };
    if (!validBackupEntry(key, entry)) throw new Error("Invalid study record");
    remember(key, records[key]);
    const baseUpdatedAt = pending[key]?.baseUpdatedAt ?? bases[key] ?? null;
    records[key] = entry; pending[key] = { ...entry, baseUpdatedAt };
    if (conflicts[key]) conflicts[key] = { ...conflicts[key], local: entry };
    schedule();
  }
  function importRecords(incoming: StudyRecords, expectedUserId = activeId ?? null) {
    if (expectedUserId !== (activeId ?? null)) throw new Error("Account changed during import");
    const entries = Object.entries(incoming);
    if (entries.some(([key, entry]) => !validBackupEntry(key, entry))) throw new Error("Invalid backup");
    if (activeId === undefined) activate(null);
    mergeDisk();
    let count = 0;
    for (const [key, entry] of entries) {
      if (entry.updatedAt <= (records[key]?.updatedAt ?? 0)) continue;
      remember(key, records[key]);
      pending[key] = { ...entry, baseUpdatedAt: pending[key]?.baseUpdatedAt ?? bases[key] ?? null };
      records[key] = entry;
      if (conflicts[key]) conflicts[key] = { ...conflicts[key], local: entry };
      count++;
    }
    if (count) schedule();
    return count;
  }
  function resolveConflict(key: string, choice: "local" | "remote") {
    const conflict = conflicts[key]; if (!conflict) return;
    remember(key, conflict.local); remember(key, conflict.remote ?? undefined);
    bases[key] = conflict.remote?.updatedAt ?? null;
    if (choice === "remote") {
      acknowledged[key] = pending[key]?.updatedAt ?? 0;
      delete pending[key];
      if (conflict.remote) records[key] = conflict.remote;
      else delete records[key];
    } else pending[key] = { ...pending[key], baseUpdatedAt: bases[key] };
    delete conflicts[key];
    schedule();
  }
  async function loadHistory(key: string) {
    const generation = epoch;
    await refresh();
    if (generation !== epoch) return [];
    if (activeId) {
      const response = await request(`/api/records?history=${encodeURIComponent(key)}`, { headers: accountHeaders(), cache: "no-store", signal: AbortSignal.timeout(15_000) });
      if (generation !== epoch) return [];
      const data: unknown = await response.json();
      if (!response.ok || !isObject(data) || data.userId !== activeId || !Array.isArray(data.versions)) throw new Error("history unavailable");
      for (const entry of data.versions) if (validBackupEntry(key, entry)) remember(key, entry);
      persist(); publish();
    }
    return [...(history[key] ?? [])].filter(entry => !records[key] || entry.updatedAt !== records[key].updatedAt || !same(entry.value, records[key].value)).sort((a, b) => b.updatedAt - a.updatedAt);
  }
  function legacyRecords() {
    const result = parseRecords(readJSON(CACHE_KEY));
    for (const [key, entry] of Object.entries(parseRecords(readJSON(QUEUE_KEY)))) if (entry.updatedAt > (result[key]?.updatedAt ?? 0)) result[key] = entry;
    return result;
  }
  function subscribe(listener: () => void) {
    listeners.add(listener);
    if (listeners.size === 1) void refresh();
    const retry = setInterval(() => { if (Object.keys(pending).some(key => !conflicts[key]) || snapshot.sync === "offline") void refresh(); }, 15_000);
    const visible = () => { if (document.visibilityState === "visible") void refresh(); };
    const changed = (event: StorageEvent) => {
      if (activeId === undefined || !Object.values(keys()).includes(event.key ?? "")) return;
      mergeDisk(); publish(); void refresh();
    };
    window.addEventListener("online", refresh);
    window.addEventListener("storage", changed);
    document.addEventListener("visibilitychange", visible);
    return () => {
      listeners.delete(listener); clearInterval(retry);
      window.removeEventListener("online", refresh); window.removeEventListener("storage", changed); document.removeEventListener("visibilitychange", visible);
      if (!listeners.size) clearTimeout(timer);
    };
  }
  return { subscribe, put, refresh, importRecords, resolveConflict, loadHistory, legacyRecords, lock,
    read: <T,>(key: string, fallback: T): T => (records[key]?.value as T | undefined) ?? fallback,
    getSnapshot: () => snapshot, getServerSnapshot: () => initial,
  };
}
