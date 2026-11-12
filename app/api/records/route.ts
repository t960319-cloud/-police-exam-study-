import { and, desc, eq, sql } from "drizzle-orm";
import { getDb } from "../../../db";
import { studyRecords, studyRecordVersions } from "../../../db/schema";
import { getStudyUser } from "../../../lib/study-user";
import { isObject, validBackupEntry } from "../../../lib/study-records";
import { requestedStudyResets } from "../../../lib/requested-study-resets";

const headers = { "Cache-Control": "no-store, private", "Vary": "Cookie, X-Study-User" };
async function authorize(request: Request) {
  const user = await getStudyUser();
  if (!user) return { error: Response.json({ code: "signed_out", error: "請先登入再同步讀書紀錄。" }, { status: 401, headers }) };
  if (request.headers.get("X-Study-User") !== user.userId) return { error: Response.json({ code: "account_changed", error: "帳號已變更，請重新讀取。" }, { status: 409, headers }) };
  return { user };
}
export async function GET(request: Request) {
  const auth = await authorize(request);
  if (auth.error) return auth.error;
  const userId = auth.user!.userId;
  try {
    const db = getDb();
    const key = new URL(request.url).searchParams.get("history");
    if (key !== null) {
      if (!/^(q|law|essay|day|update|settings|custom):[a-zA-Z0-9_-]{1,100}$/.test(key)) return Response.json({ error: "紀錄鍵不正確" }, { status: 400, headers });
      const rows = await db.select().from(studyRecordVersions).where(and(eq(studyRecordVersions.userId, userId), eq(studyRecordVersions.key, key))).orderBy(desc(studyRecordVersions.updatedAt)).limit(20);
      return Response.json({ userId, versions: rows.map(r => ({ value: JSON.parse(r.value), updatedAt: r.updatedAt })) }, { headers });
    }
    let rows = await db.select().from(studyRecords).where(eq(studyRecords.userId, userId));
    // Apply only the owner's explicitly requested acceptance-test rollback.
    // Exact account and saved versions make it one-shot; later practice wins.
    const resets = requestedStudyResets(userId, Object.fromEntries(rows.map(r => [r.key, { value: JSON.parse(r.value), updatedAt: r.updatedAt }])), Date.now());
    for (const [recordKey, record] of Object.entries(resets)) {
      const previous = rows.find(r => r.key === recordKey)!;
      await db.batch([
        db.insert(studyRecordVersions).values({ userId, key: recordKey, value: previous.value, updatedAt: previous.updatedAt, savedAt: Date.now() }).onConflictDoNothing(),
        db.update(studyRecords).set({ value: JSON.stringify(record.value), updatedAt: record.updatedAt })
          .where(and(eq(studyRecords.userId, userId), eq(studyRecords.key, recordKey), eq(studyRecords.updatedAt, previous.updatedAt))),
      ]);
    }
    if (Object.keys(resets).length) rows = await db.select().from(studyRecords).where(eq(studyRecords.userId, userId));
    return Response.json({ userId, records: Object.fromEntries(rows.map(r => [r.key, { value: JSON.parse(r.value), updatedAt: r.updatedAt }])) }, { headers });
  } catch { return Response.json({ error: "讀書紀錄暫時無法同步；已在此裝置保留。" }, { status: 503, headers }); }
}
export async function PUT(request: Request) {
  const auth = await authorize(request);
  if (auth.error) return auth.error;
  const userId = auth.user!.userId;
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return Response.json({ error: "來源不符" }, { status: 403, headers });
  let body: unknown;
  try {
    const raw = await request.text();
    if (raw.length > 600_000) return Response.json({ error: "紀錄過大" }, { status: 413, headers });
    body = JSON.parse(raw);
  } catch { return Response.json({ error: "紀錄格式不正確" }, { status: 400, headers }); }
  if (!isObject(body)) return Response.json({ error: "紀錄格式不正確" }, { status: 400, headers });
  const { key, value, updatedAt, baseUpdatedAt } = body;
  if (typeof key !== "string" || !validBackupEntry(key, { value, updatedAt }) || !(baseUpdatedAt === null || (Number.isSafeInteger(baseUpdatedAt) && (baseUpdatedAt as number) > 0))) return Response.json({ error: "紀錄或版本格式不正確，請重新整理後重試。" }, { status: 400, headers });
  const serialized = JSON.stringify(value);
  if (serialized.length > 550_000) return Response.json({ error: "紀錄過大" }, { status: 413, headers });
  try {
    const db = getDb();
    const where = and(eq(studyRecords.userId, userId), eq(studyRecords.key, key));
    const version = Math.max(Date.now(), updatedAt as number, (baseUpdatedAt as number | null ?? 0) + 1);
    const [previous] = await db.select().from(studyRecords).where(where);
    // D1 batches are atomic. Keep the previous version and conditionally update
    // by the version the client actually read, never by its wall clock alone.
    const mutation = baseUpdatedAt === null
      ? db.insert(studyRecords).values({ userId, key, value: serialized, updatedAt: version }).onConflictDoNothing().returning()
      : db.update(studyRecords).set({ value: serialized, updatedAt: version }).where(and(where, eq(studyRecords.updatedAt, baseUpdatedAt as number))).returning();
    let changed;
    if (previous) {
      const results = await db.batch([
        db.insert(studyRecordVersions).values({ userId, key, value: previous.value, updatedAt: previous.updatedAt, savedAt: Date.now() }).onConflictDoNothing(),
        mutation,
        db.delete(studyRecordVersions).where(sql`${studyRecordVersions.userId} = ${userId} AND ${studyRecordVersions.key} = ${key} AND ${studyRecordVersions.updatedAt} NOT IN (SELECT updated_at FROM study_record_versions WHERE user_id = ${userId} AND record_key = ${key} ORDER BY updated_at DESC LIMIT 20)`),
      ]);
      changed = results[1];
    } else changed = await mutation;
    if (!changed.length) {
      const [current] = await db.select().from(studyRecords).where(where);
      return Response.json({ code: "conflict", userId, key, record: current ? { value: JSON.parse(current.value), updatedAt: current.updatedAt } : null }, { status: 409, headers });
    }
    const saved = changed[0];
    return Response.json({ userId, key, record: { value: JSON.parse(saved.value), updatedAt: saved.updatedAt } }, { headers });
  } catch { return Response.json({ error: "同步未完成；已保留本機紀錄，可稍後重試。" }, { status: 503, headers }); }
}
