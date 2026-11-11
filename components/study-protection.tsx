"use client";
import { useState } from "react";
import type { useStudyStore } from "../lib/study-store";
import { isObject, type RecordEntry } from "../lib/study-records";
import { ALL_QUESTIONS, ALL_ESSAYS } from "../lib/past-exams";
import { LAWS, UPDATE_TASKS } from "../lib/study-data";

type Store = ReturnType<typeof useStudyStore>;
const date = (stamp: number) => new Intl.DateTimeFormat("zh-TW", { dateStyle: "short", timeStyle: "medium", timeZone: "Asia/Taipei" }).format(stamp);
function title(key: string) {
  const [kind, id] = key.split(":");
  if (kind === "day") return `${id} 每日安排`;
  return [...ALL_QUESTIONS, ...ALL_ESSAYS, ...LAWS, ...UPDATE_TASKS].find(item => item.id === id)?.title ?? ({ q: "題目紀錄", essay: "申論草稿", law: "法條熟悉度", custom: "自建題目", settings: "個人設定", update: "查證筆記" }[kind] ?? "學習紀錄");
}
const names: Record<string, string> = { intro: "前言", allocation: "依配分分段", basis: "法律依據", analysis: "要件／措施／程序", conclusion: "結語", checks: "自評勾選", note: "筆記", status: "掌握狀態", attempts: "作答次數", correct: "答對次數", bookmarked: "收藏", wrong: "曾答錯", lastAnswer: "最近答案", lastAnswers: "最近答案", lastDate: "最近練習日", nextReview: "下次複習日", tasks: "完成安排", seconds: "專注秒數", questions: "練習題目", essays: "練習申論", date: "日期", reference: "文號", completed: "已完成查證", title: "題目標題", stem: "題幹" };
function preview(value: unknown) {
  if (typeof value === "string") return ({ mastered: "已掌握", unseen: "尚未練習", review: "待複習", verify: "需要查證" }[value] ?? value);
  if (!isObject(value)) return "無紀錄";
  return Object.entries(value).filter(([key]) => names[key]).map(([key, value]) => `${names[key]}：${Array.isArray(value) ? value.join("、") : typeof value === "boolean" ? value ? "是" : "否" : String(value ?? "")}`).join("\n") || "個人學習紀錄";
}
export function StudyProtection({ store }: { store: Store }) {
  const [selected, setSelected] = useState("");
  const [versions, setVersions] = useState<RecordEntry[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const keys = Object.keys(store.records);
  const selectedKey = keys.includes(selected) ? selected : keys[0];
  const exportLegacy = () => {
    const blob = new Blob([JSON.stringify({ version: 1, records: store.legacyRecords() }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a"); link.href = url; link.download = "police-study-unassigned-backup.json"; link.click(); setTimeout(() => URL.revokeObjectURL(url), 2000);
  };
  return <section className="study-protection">
    <h3>帳號與資料保護</h3>
    <p>{store.user ? `目前使用：${store.user.displayName}。學習紀錄與待同步資料依帳號分開保存。` : "目前尚未登入，編輯僅保存在此裝置，不會自動轉入之後登入的帳號。"}</p>
    {store.user?.mode === "account" ? <a className="text-button" href="/signout-with-chatgpt?return_to=%2F" target="_top" onClick={() => store.lock()}>登出並關閉目前紀錄</a> : <a className="text-button" href="/signin-with-chatgpt?return_to=%2F" target="_top" onClick={() => store.lock()}>登入帳號</a>}
    {store.legacyAvailable && <div className="notice warning"><div><strong>找到舊版未綁定帳號的紀錄</strong><p>這些資料尚未歸入目前帳號。請先匯出核對，確認屬於自己後，再使用上方備份匯入。</p><button className="button secondary" onClick={exportLegacy}>匯出舊版本機紀錄</button></div></div>}
    {Object.entries(store.conflicts).map(([key, conflict]) => <article className="sync-conflict" key={key}>
      <h4>{title(key)}：有兩份不同修改</h4>
      <p>兩份內容均已保留，請比較後選擇。你也可以先匯出完整備份。</p>
      <details open><summary>我的版本・{date(conflict.local.updatedAt)}</summary><pre>{preview(conflict.local.value)}</pre></details>
      <details open><summary>其他裝置版本{conflict.remote ? `・${date(conflict.remote.updatedAt)}` : "・目前沒有紀錄"}</summary><pre>{preview(conflict.remote?.value)}</pre></details>
      <div className="heading-actions"><button className="button primary" onClick={() => store.resolveConflict(key, "local")}>保留我的版本</button><button className="button secondary" onClick={() => store.resolveConflict(key, "remote")}>採用其他裝置版本</button></div>
    </article>)}
    <h3>版本還原</h3><p>已同步紀錄保留最近20個雲端舊版本，此裝置另保留最近20次修改。還原會建立一筆新修改，仍會檢查多裝置衝突。</p>
    {keys.length ? <><label>選擇學習紀錄<select aria-label="選擇還原紀錄" value={selectedKey} onChange={e => { setSelected(e.target.value); setVersions([]); setMessage(""); }}>{keys.map(key => <option key={key} value={key}>{title(key)}</option>)}</select></label>
      <button className="button secondary" disabled={loading} onClick={async () => { setLoading(true); setMessage(""); try { const result = await store.loadHistory(selectedKey); setVersions(result); if (!result.length) setMessage("這筆紀錄尚無可還原的舊版本。"); } catch { setMessage("雲端版本暫時無法讀取，請恢復連線後重試。"); } finally { setLoading(false); } }}>{loading ? "讀取中…" : "查看可還原版本"}</button>
      {versions.map((version, index) => <details key={`${version.updatedAt}-${index}`}><summary>{date(version.updatedAt)}</summary><pre>{preview(version.value)}</pre><button className="button secondary" onClick={() => { store.put(selectedKey, version.value); setMessage("已套用選取內容，等待同步；原內容仍可由版本紀錄找回。"); }}>還原這個版本</button></details>)}</> : <p>累積學習紀錄後即可查看版本。</p>}
    {message && <p role="status">{message}</p>}
  </section>;
}
