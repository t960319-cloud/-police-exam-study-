import { and, eq, sql } from "drizzle-orm";
import { getDb } from "../../../db";
import { studyRecords } from "../../../db/schema";
import { getChatGPTUser } from "../../chatgpt-auth";

async function userId() {
  const user = await getChatGPTUser();
  if (user) return user.userId;
  if (import.meta.env.DEV) return "local-preview";
  return null;
}

export async function GET() {
  const user = await userId();
  if (!user) return Response.json({ error: "請先登入再同步讀書紀錄。" }, { status: 401 });
  try {
    const rows = await getDb().select().from(studyRecords).where(eq(studyRecords.userId, user));
    return Response.json({ records: Object.fromEntries(rows.map(r => [r.key, { value: JSON.parse(r.value), updatedAt: r.updatedAt }])) }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "讀書紀錄暫時無法同步；已在此裝置保留。" }, { status: 503 });
  }
}

export async function PUT(request: Request) {
  const user = await userId();
  if (!user) return Response.json({ error: "請先登入再同步讀書紀錄。" }, { status: 401 });
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return Response.json({ error: "來源不符" }, { status: 403 });
  try {
    const raw = await request.text();
    if (raw.length > 600_000) return Response.json({ error: "紀錄過大" }, { status: 413 });
    const { key, value, updatedAt } = JSON.parse(raw);
    if (typeof key !== "string" || !/^(q|law|essay|day|update|settings|custom):[a-zA-Z0-9_-]{1,100}$/.test(key) || !Number.isSafeInteger(updatedAt) || updatedAt <= 0 || updatedAt > Date.now() + 86_400_000 || value === undefined) return Response.json({ error: "紀錄格式不正確" }, { status: 400 });
    const serialized = JSON.stringify(value);
    if (serialized.length > 550_000) return Response.json({ error: "紀錄過大" }, { status: 413 });
    await getDb().insert(studyRecords).values({ userId: user, key, value: serialized, updatedAt }).onConflictDoUpdate({
      target: [studyRecords.userId, studyRecords.key],
      set: { value: serialized, updatedAt },
      setWhere: sql`${studyRecords.updatedAt} <= ${updatedAt}`,
    });
    const [row] = await getDb().select().from(studyRecords).where(and(eq(studyRecords.userId, user), eq(studyRecords.key, key)));
    return Response.json({ key, record: { value: JSON.parse(row.value), updatedAt: row.updatedAt } }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "同步未完成；已保留本機紀錄，可稍後重試。" }, { status: 503 });
  }
}
