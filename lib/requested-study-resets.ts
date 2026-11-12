import { isObject, type StudyRecords } from "./study-records";

// The owner asked to exclude this single acceptance test from study progress.
// Exact account and saved versions keep this from clearing later real practice.
const account = "shVgVyoeBfKTxDwo3fScSDvq4m9q8AimmjmDT0CgoUI3Uucq4Xndle";
const questionId = "investigation115_04";
const questionKey = `q:${questionId}`;
const dayKey = "day:2026-11-12";

export function requestedStudyResets(userId: string, records: StudyRecords, now: number): StudyRecords {
  if (userId !== account) return {};
  const result: StudyRecords = {};
  const question = records[questionKey];
  if (question?.updatedAt === 1794441308857 && isObject(question.value)
    && question.value.attempts === 1 && question.value.correct === 1
    && question.value.lastAnswer === 2 && question.value.lastDate === "2026-11-12") {
    result[questionKey] = {
      value: { status: "unseen", bookmarked: false, wrong: false, attempts: 0, correct: 0 },
      updatedAt: Math.max(now, question.updatedAt + 1),
    };
  }
  const day = records[dayKey];
  if (day?.updatedAt === 1794441216849 && isObject(day.value)
    && Array.isArray(day.value.questions) && day.value.questions.includes(questionId)) {
    result[dayKey] = {
      value: { ...day.value, questions: day.value.questions.filter(id => id !== questionId) },
      updatedAt: Math.max(now, day.updatedAt + 1),
    };
  }
  return result;
}
