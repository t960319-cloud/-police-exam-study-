"use client";
import { useState } from "react";
import type { Essay, Question } from "../lib/study-data";
import { needsLegalReview } from "../lib/study-priorities";

export function LegalReviewQueue({ questions, essays, flaggedIds, onQuestion, onEssay }: {
  questions: Question[]; essays: Essay[]; flaggedIds: Set<string>;
  onQuestion: (id: string) => void; onEssay: (id: string) => void;
}) {
  const [kind, setKind] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pending = [
    ...questions.filter(q => needsLegalReview(q) || flaggedIds.has(q.id)).map(q => ({ ...q, kind: "question" })),
    ...essays.filter(needsLegalReview).map(e => ({ ...e, kind: "essay" })),
  ];
  const filtered = pending.filter(q => (kind === "all" || kind === q.kind)
    && `${q.title} ${q.paperYear ?? ""} ${q.subject} ${q.amendment?.note ?? ""}`.toLowerCase().includes(search.trim().toLowerCase()));
  const pages = Math.max(1, Math.ceil(filtered.length / 8));
  const current = Math.min(page, pages);
  return <section className="panel legal-review-queue" aria-labelledby="legal-queue-heading">
    <div className="panel-header"><h2 id="legal-queue-heading">尚待核對的題目 <span className="count-badge">{pending.length}</span></h2></div>
    <p>集中列出原件、現行解析或生效情形待核，以及你標記需要查證的題目。掌握度不會消除內容疑點。</p>
    <div className="legal-queue-filters">
      <input aria-label="搜尋待核題目" placeholder="搜尋題名、年度、科目或待核原因" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}/>
      <select aria-label="待核題型" value={kind} onChange={e => { setKind(e.target.value); setPage(1); }}><option value="all">全部題型</option><option value="question">選擇題</option><option value="essay">申論題</option></select>
    </div>
    <p role="status">符合 {filtered.length} 題</p>
    {filtered.slice((current - 1) * 8, current * 8).map(q => <button className="legal-queue-row" key={`${q.kind}:${q.id}`} onClick={() => q.kind === "question" ? onQuestion(q.id) : onEssay(q.id)}>
      <span className="pill amber">{needsLegalReview(q) ? "內容待核" : "個人標記待查"}</span>
      <span><small>{q.paperYear ? `${q.paperYear}年・${q.paperTrack}・` : "主題練習・"}{q.subject}・{q.kind === "question" ? "選擇" : "申論"}{q.paperNumber ? `第${q.paperNumber}題` : ""}</small><strong>{q.title}</strong><span>{q.amendment?.note || (needsLegalReview(q) ? "完整原件或現行解析仍待核對。" : "你已將這題標記為需要查證。")}</span></span>
    </button>)}
    {!filtered.length && <p className="legal-queue-empty">{pending.length ? "沒有符合搜尋條件的待核題目。" : "目前沒有待核題目。"}</p>}
    <div className="pagination no-print"><span>第{current} / {pages}頁</span><button className="button secondary" aria-label="上一頁待核題目" disabled={current === 1} onClick={() => setPage(current - 1)}>上一頁</button><button className="button secondary" aria-label="下一頁待核題目" disabled={current === pages} onClick={() => setPage(current + 1)}>下一頁</button></div>
  </section>;
}
