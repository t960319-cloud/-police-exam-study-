import type { ExamFields, Law, Question } from "./study-data";
import type { StudyRecords } from "./study-records";

export type Mastery = "unseen" | "mastered" | "review" | "verify";
export type QProgress = {
  status: Mastery; bookmarked: boolean; wrong: boolean; attempts: number; correct: number;
  lastAnswer?: number; lastAnswers?: number[]; lastDate?: string; nextReview?: string; note?: string;
};
export const DEFAULT_QUESTION_PROGRESS: QProgress = {
  status: "unseen", bookmarked: false, wrong: false, attempts: 0, correct: 0,
};
export function questionProgress(records: StudyRecords, id: string): QProgress {
  return (records[`q:${id}`]?.value as QProgress | undefined) ?? DEFAULT_QUESTION_PROGRESS;
}
export function needsLegalReview(item: ExamFields & { verified: boolean }): boolean {
  return !item.verified || item.amendment?.status === "review" || item.amendment?.effectiveStatus === "unverified";
}
function daysSince(date: string | undefined, today: string): number {
  if (!date) return 30;
  const days = (Date.parse(today) - Date.parse(date)) / 86400000;
  return Number.isFinite(days) ? Math.max(0, Math.min(30, days)) : 30;
}
type Topic = { id: string; name: string; short: string; color: string };

export function rankStudyTopics<T extends Topic>(topics: T[], questions: Question[], laws: Law[], records: StudyRecords, today: string) {
  return topics.map((topic, index) => {
    const qs = questions.filter(q => q.topic === topic.id);
    const ps = qs.map(q => questionProgress(records, q.id));
    const topicLaws = laws.filter(l => l.topic === topic.id);
    const masteredLaws = topicLaws.filter(l => records[`law:${l.id}`]?.value === "mastered").length;
    const attempts = ps.reduce((sum, p) => sum + p.attempts, 0);
    const errors = ps.reduce((sum, p) => sum + Math.max(0, p.attempts - p.correct), 0);
    const errorRate = attempts ? errors / attempts : null;
    const lastPractice = ps.flatMap(p => p.lastDate ? [p.lastDate] : []).sort().at(-1);
    const active = ps.filter(p => p.status !== "mastered" && (p.wrong || p.status === "review")).length;
    const due = ps.filter(p => p.nextReview && p.nextReview <= today).length;
    const masteredQuestions = ps.filter(p => p.status === "mastered").length;
    const lawGap = topicLaws.length ? 1 - masteredLaws / topicLaws.length : 0;
    // Rates keep large topics from dominating. Recency is capped at 30 days.
    const unmasteredShare = qs.length ? 1 - masteredQuestions / qs.length : 1;
    const score = (errorRate ?? 0) * unmasteredShare * 40 + daysSince(lastPractice, today) / 30 * 20
      + lawGap * 20 + (qs.length ? active / qs.length * 15 + due / qs.length * 15 : 0)
      - (qs.length ? masteredQuestions / qs.length * 10 : 0);
    const reasons = [due ? `${due}題到期` : "", errorRate && unmasteredShare ? `答錯率${Math.round(errorRate * 100)}%` : "",
      !lastPractice ? "尚未練習" : daysSince(lastPractice, today) >= 7 ? "超過一週未練" : "",
      lawGap > 0 ? `法條${masteredLaws}/${topicLaws.length}已掌握` : ""].filter(Boolean);
    return { topic, score, index, totalQuestions: qs.length, masteredQuestions, errorRate, lastPractice,
      masteredLaws, totalLaws: topicLaws.length, reason: reasons.slice(0, 2).join("・") || "持續鞏固掌握度" };
  }).filter(t => t.totalQuestions || t.totalLaws).sort((a, b) => b.score - a.score || a.index - b.index);
}

export function selectDailyQuestions(questions: Question[], records: StudyRecords, topics: { topic: { id: string }; score: number }[], today: string, onlyReview = false) {
  const topicScores = new Map(topics.map(t => [t.topic.id, t.score]));
  const score = (q: Question) => {
    const p = questionProgress(records, q.id);
    const due = p.nextReview && p.nextReview <= today;
    return (due ? 150 : 0) + (p.status === "review" ? 60 : 0)
      + (p.wrong && p.status !== "mastered" ? 40 : 0)
      + (p.attempts ? Math.max(0, 1 - p.correct / p.attempts) * 30 : 10)
      + daysSince(p.lastDate, today) / 30 * 15 + (topicScores.get(q.topic) ?? 0) / 5
      - (p.status === "mastered" ? 80 : 0) - (p.nextReview && p.nextReview > today ? 40 : 0);
  };
  return questions.filter(q => {
    const p = questionProgress(records, q.id);
    return !needsLegalReview(q) && p.status !== "verify"
      && (!onlyReview || (p.wrong && p.status !== "mastered") || p.status === "review");
  }).sort((a, b) => score(b) - score(a) || a.id.localeCompare(b.id)).slice(0, 8);
}
