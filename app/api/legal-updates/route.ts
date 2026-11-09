import { and, asc, desc, eq, gt, or } from "drizzle-orm";
import { getDb } from "../../../db";
import { legalContentEvents } from "../../../db/schema";
import { ALL_ESSAYS, ALL_QUESTIONS } from "../../../lib/past-exams";
import { validateLegalEvent } from "../../../lib/legal-updates";
import { LAWS } from "../../../lib/study-data";

const headers={"Cache-Control":"no-store"};
const targets=new Set([...ALL_QUESTIONS,...ALL_ESSAYS,...LAWS].map(x=>x.id));
// This shared updater relies on Sites' confirmed owner-only access boundary.
// Service access is consumed by Sites dispatch and does not carry visitor identity.
// Do not make this Site public without adding separate server-side writer authorization.
export async function GET(request:Request){
  try{
    const cursor=new URL(request.url).searchParams.get("cursor");
    let after:{time:number;id:string}|null=null;
    if(cursor){try{after=JSON.parse(atob(cursor));}catch{return Response.json({error:"游標格式錯誤"},{status:400});}if(!after||!Number.isSafeInteger(after.time)||typeof after.id!=="string"||after.id.length>100)return Response.json({error:"游標格式錯誤"},{status:400});}
    const where=after?and(eq(legalContentEvents.kind,"update"),or(gt(legalContentEvents.createdAt,after.time),and(eq(legalContentEvents.createdAt,after.time),gt(legalContentEvents.eventId,after.id)))):eq(legalContentEvents.kind,"update");
    const db=getDb();
    const [rows,checks]=await Promise.all([
      db.select().from(legalContentEvents).where(where).orderBy(asc(legalContentEvents.createdAt),asc(legalContentEvents.eventId)).limit(51),
      db.select().from(legalContentEvents).orderBy(desc(legalContentEvents.createdAt),desc(legalContentEvents.eventId)).limit(1),
    ]);
    const page=rows.slice(0,50);const last=page.at(-1);
    return Response.json({events:page.map(r=>({...JSON.parse(r.payload),createdAt:r.createdAt})),latestCheck:checks[0]?{...JSON.parse(checks[0].payload),createdAt:checks[0].createdAt}:null,nextCursor:rows.length>50&&last?btoa(JSON.stringify({time:last.createdAt,id:last.eventId})):null},{headers});
  }catch{return Response.json({error:"法規更新暫時無法讀取；請先參考題目內的核對日期。"},{status:503,headers});}
}

export async function POST(request:Request){
  const origin=request.headers.get("origin");if(origin&&origin!==new URL(request.url).origin)return Response.json({error:"來源不符"},{status:403});
  try{
    const text=await request.text();if(text.length>300000)return Response.json({error:"更新資料過大"},{status:413});
    let value:unknown;try{value=JSON.parse(text);}catch{return Response.json({error:"JSON格式錯誤"},{status:400});}
    if(!validateLegalEvent(value,targets))return Response.json({error:"更新格式不符；須有正式來源、核對日期及既有題目ID。"},{status:400});
    if(value.patches?.some(p=>(p.lawContent&&!LAWS.some(l=>l.id===p.targetId))||(p.model&&!ALL_ESSAYS.some(e=>e.id===p.targetId))||(p.optionOverrides&&!ALL_QUESTIONS.some(q=>q.id===p.targetId))))return Response.json({error:"更新欄位與目標類型不符。"},{status:400});
    const db=getDb();const [before]=await db.select().from(legalContentEvents).where(eq(legalContentEvents.eventId,value.eventId));
    const payload=JSON.stringify(value);
    if(before)return before.payload===payload?Response.json({saved:true,idempotent:true,eventId:before.eventId,createdAt:before.createdAt},{headers}):Response.json({error:"此更新編號已存在，歷史紀錄不得覆寫。"},{status:409});
    const createdAt=Date.now();await db.insert(legalContentEvents).values({eventId:value.eventId,kind:value.kind,payload,createdAt});
    return Response.json({saved:true,eventId:value.eventId,createdAt},{status:201,headers});
  }catch{return Response.json({error:"法規更新尚未保存，請重試並讀回確認。"},{status:503,headers});}
}
