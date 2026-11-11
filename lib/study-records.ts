import { SUBJECTS, TOPICS, type Question } from "./study-data";

export type RecordEntry = { value: unknown; updatedAt: number };
export type StudyRecords = Record<string, RecordEntry>;
export type EssayDraft = Partial<Record<"intro" | "allocation" | "basis" | "analysis" | "conclusion", string>> & { checks?: string[] };
export type UpdateRecord = { date?: string; reference?: string; note?: string; completed?: boolean };
export const CACHE_KEY = "police-study-records-v1";
export const QUEUE_KEY = "police-study-pending-v1";
const statuses = ["unseen", "mastered", "review", "verify"];
export function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
const strings = (v: unknown): v is string[] => Array.isArray(v) && v.every(x => typeof x === "string");
const count = (v: unknown): v is number => Number.isSafeInteger(v) && (v as number) >= 0;
export function isQuestion(q: unknown): q is Question {
  return isObject(q) && typeof q.id === "string" && /^[a-zA-Z0-9_-]+$/.test(q.id)
    && typeof q.title === "string" && typeof q.stem === "string"
    && SUBJECTS.some(s => s === q.subject) && TOPICS.some(t => t.id === q.topic)
    && Array.isArray(q.options) && q.options.length === 4
    && q.options.every((o: unknown) => isObject(o) && typeof o.text === "string" && typeof o.explanation === "string" && typeof o.correction === "string" && typeof o.trueStatement === "boolean")
    && count(q.answer) && q.answer < 4 && strings(q.lawIds)
    && typeof q.origin === "string" && typeof q.takeaway === "string" && typeof q.verified === "boolean"
    && (q.target === "正確" || q.target === "錯誤") && (q.difficulty === "基礎" || q.difficulty === "進階");
}
export function validBackupEntry(key: string, entry: unknown): entry is RecordEntry {
  if (!/^(q|law|essay|day|update|settings|custom):[a-zA-Z0-9_-]{1,100}$/.test(key)
    || !isObject(entry) || !count(entry.updatedAt) || entry.updatedAt === 0
    || entry.updatedAt > Date.now() + 86_400_000) return false;
  const v = entry.value;
  if (key.startsWith("custom:")) return isQuestion(v);
  if (key.startsWith("law:")) return typeof v === "string" && statuses.includes(v);
  if (!isObject(v)) return false;
  if (key.startsWith("day:")) return strings(v.questions) && strings(v.tasks) && strings(v.essays) && count(v.seconds);
  if (key.startsWith("q:")) return typeof v.status === "string" && statuses.includes(v.status)
    && typeof v.bookmarked === "boolean" && typeof v.wrong === "boolean"
    && count(v.attempts) && count(v.correct) && v.correct <= v.attempts
    && (v.note === undefined || typeof v.note === "string");
  if (key.startsWith("essay:")) return ["intro", "allocation", "basis", "analysis", "conclusion"].every(f => v[f] === undefined || typeof v[f] === "string")
    && (v.checks === undefined || strings(v.checks));
  if (key.startsWith("update:")) return ["date", "reference", "note"].every(f => v[f] === undefined || typeof v[f] === "string")
    && (v.completed === undefined || typeof v.completed === "boolean");
  return true;
}
export function parseRecords(value: unknown): StudyRecords {
  if (!isObject(value)) return {};
  return Object.fromEntries(Object.entries(value).filter(([key, entry]) => validBackupEntry(key, entry))) as StudyRecords;
}

export type StudyUser = { userId: string; displayName: string; mode: "account" | "development" };
export type RecordConflict = { local: RecordEntry; remote: RecordEntry | null };
export const scopedKeys = (userId: string | null) => {
  const scope = userId === null ? "guest" : `user:${encodeURIComponent(userId)}`;
  return { cache: `police-study-records-v2:${scope}`, queue: `police-study-pending-v2:${scope}`, base: `police-study-base-v2:${scope}`, history: `police-study-history-v2:${scope}`, conflicts: `police-study-conflicts-v2:${scope}` };
};
