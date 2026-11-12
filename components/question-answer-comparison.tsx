import type { Question } from "../lib/study-data";
import { answerLabel } from "../lib/past-exams";
import { needsLegalReview } from "../lib/study-priorities";

export function QuestionAnswerComparison({ question: q }: { question: Question }) {
  const status = q.amendment?.effectiveStatus;
  const pending = needsLegalReview(q);
  const text = q.currentAnswer || q.amendment?.newRule
    || (pending ? "完整原件或現行解析仍待核對，暫不提供現行選項答案。" : "尚未提供獨立的現行作答對照；請依相關法源及核對日期確認，當年答案不自動視為現行答案。");
  return <section className="answer-comparison" aria-label="當年答案與現行作答對照">
    <h3>答案與法規時效對照</h3>
    <div className="answer-comparison-grid">
      <div className="historical-answer"><span>{q.paperYear ? `${q.paperYear}年考試答案` : "本題參考答案"}</span><strong>{q.creditedAll ? "一律給分" : answerLabel(q)}</strong><p>{q.paperYear ? "依當年官方最終公告計分，保留官方更正。" : "依本題參考答案計分。"}</p>{q.correctionNote && <p>{q.correctionNote}</p>}</div>
      <div className={pending ? "current-answer pending" : "current-answer"}><span>依現行法規應如何作答</span><strong>{pending ? "尚待核對" : status === "mixed" ? "分階段施行，須辨別日期" : status === "announced" ? "已公布未生效" : "現行作答對照"}</strong><p>{text}</p>{pending && <small>上述內容含待核事項，尚不能作為確定的現行選項答案。</small>}{q.amendment?.checkedAt && <small>核對日：{q.amendment.checkedAt}</small>}{q.amendment?.effectiveDate && <small>施行日期／階段：{q.amendment.effectiveDate}</small>}</div>
    </div>
  </section>;
}
