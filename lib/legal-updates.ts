import type { AmendmentNote, Essay, Law, Question } from "./study-data";

export type LegalPatch = {
  targetId: string;
  amendment: AmendmentNote;
  verified?: boolean;
  optionOverrides?: { index: number; explanation: string; correction: string; trueStatement?: boolean }[];
  takeaway?: string;
  model?: Essay["model"];
  currentAnswer?: string | null;
  lawContent?: Pick<Law,"original"|"originalLabel"|"core"|"points"|"traps"|"memory"|"scenario"|"version"|"verified"|"verificationNote"|"sources">;
};
export type LegalEvent = {
  eventId: string;
  kind: "check" | "update";
  checkedAt: string;
  summary: string;
  sources: { title: string; url: string }[];
  patches?: LegalPatch[];
};
export type SavedLegalEvent = LegalEvent & { createdAt: number };

const bounded = (v: unknown, max = 12000): v is string => typeof v === "string" && v.trim().length > 0 && v.length <= max;
const date = (v: unknown): v is string => typeof v === "string" && /^20\d{2}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0,10) === v && v <= new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Taipei"}).format(new Date());
const officialSources = (v: unknown): v is { title: string; url: string }[] => Array.isArray(v) && v.length > 0 && v.length <= 30 && v.every(s => {
  if (!bounded(s?.title, 300) || !bounded(s?.url, 2000)) return false;
  try { const u = new URL(s.url); return u.protocol === "https:" && (u.hostname.endsWith(".gov.tw") || u.hostname === "gov.tw"); } catch { return false; }
});
export function validateLegalEvent(value: unknown, targetIds: Set<string>): value is LegalEvent {
  const v = value as LegalEvent;
  if (!v || !bounded(v.eventId, 100) || !/^[a-zA-Z0-9_-]+$/.test(v.eventId) || !["check", "update"].includes(v.kind) || !date(v.checkedAt) || !bounded(v.summary, 4000) || !officialSources(v.sources)) return false;
  if (v.kind === "check") return !v.patches?.length;
  if (!Array.isArray(v.patches) || !v.patches.length || v.patches.length > 40) return false;
  const seen = new Set<string>();
  return v.patches.every(p => {
    if (!targetIds.has(p.targetId) || seen.has(p.targetId)) return false;
    seen.add(p.targetId);
    const a = p.amendment;
    if(p.verified !== undefined && typeof p.verified !== "boolean")return false;
    if (!a || !["changed", "review", "none"].includes(a.status) || !bounded(a.note) || !officialSources(a.sources)) return false;
    if (a.checkedAt !== v.checkedAt) return false;
    if (a.effectiveStatus && !["in-force", "announced", "mixed", "unverified"].includes(a.effectiveStatus)) return false;
    for (const key of ["law", "date", "oldRule", "newRule", "effectiveDate"] as const) if (a[key] !== undefined && !bounded(a[key])) return false;
    if (p.optionOverrides && (!Array.isArray(p.optionOverrides) || p.optionOverrides.length > 4 || new Set(p.optionOverrides.map(o=>o.index)).size !== p.optionOverrides.length || !p.optionOverrides.every(o => Number.isInteger(o.index) && o.index >= 0 && o.index < 4 && bounded(o.explanation) && bounded(o.correction) && (o.trueStatement === undefined || typeof o.trueStatement === "boolean")))) return false;
    if (p.model && !["intro", "basis", "analysis", "conclusion"].every(k => bounded(p.model?.[k as keyof Essay["model"]]))) return false;
    if (p.lawContent) {
      const l=p.lawContent;
      if(!["original","originalLabel","core","memory","scenario","version","verificationNote"].every(k=>bounded(l[k as keyof typeof l])) || typeof l.verified!=="boolean" || !officialSources(l.sources))return false;
      if(![l.points,l.traps].every(a=>Array.isArray(a)&&a.length>0&&a.length<=40&&a.every(t=>bounded(t))))return false;
    }
    return (p.takeaway === undefined || bounded(p.takeaway)) && (p.currentAnswer === undefined || p.currentAnswer === null || bounded(p.currentAnswer, 3000));
  });
}

export function applyLegalEvents(questions: Question[], essays: Essay[], events: SavedLegalEvent[], laws:Law[]=[]) {
  const patches = new Map<string, LegalPatch>();
  for (const event of events) for (const patch of event.patches ?? []) {
    const before = patches.get(patch.targetId);
    patches.set(patch.targetId, { ...before, ...patch, optionOverrides: patch.optionOverrides ? [...(before?.optionOverrides ?? []).filter(o=>!patch.optionOverrides!.some(n=>n.index===o.index)), ...patch.optionOverrides] : before?.optionOverrides });
  }
  return {
    questions: questions.map(q => {
      const p = patches.get(q.id); if (!p) return q;
      return { ...q, amendment:p.amendment, ...(p.verified !== undefined ? {verified:p.verified}:{}), ...(p.currentAnswer !== undefined ? {currentAnswer:p.currentAnswer??undefined} : {}), ...(p.takeaway ? {takeaway:p.takeaway} : {}), options:q.options.map((o,index)=>({...o,...p.optionOverrides?.find(x=>x.index===index)})) };
    }),
    essays: essays.map(e => { const p=patches.get(e.id); return p ? {...e,amendment:p.amendment,...(p.verified!==undefined?{verified:p.verified}:{}),...(p.model?{model:p.model}:{}),...(p.currentAnswer!==undefined?{currentAnswer:p.currentAnswer??undefined}:{})} : e; }),
    laws: laws.map(l=>{const p=patches.get(l.id);return p?{...l,...p.lawContent,amendment:p.amendment}:l;}),
  };
}
