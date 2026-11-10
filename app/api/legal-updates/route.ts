import { and, asc, desc, eq, gt, or } from "drizzle-orm";
import { getDb } from "../../../db";
import { legalContentEvents } from "../../../db/schema";
import type { SavedLegalEvent } from "../../../lib/legal-updates";
import curatedData from "../../../lib/curated-updates.json";

const headers={"Cache-Control":"no-store"};
const curated=curatedData as SavedLegalEvent[];
const compare=(a:SavedLegalEvent,b:SavedLegalEvent)=>a.createdAt-b.createdAt||(a.eventId<b.eventId?-1:a.eventId>b.eventId?1:0);
// Site access may be public. Legal changes are reviewed and published from source;
// the old D1 event history is read-only and remains visible in the timeline.
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
    const d1Events=rows.map(r=>({...JSON.parse(r.payload),createdAt:r.createdAt}) as SavedLegalEvent);
    const additional=curated.filter(e=>e.kind==="update"&&(!after||e.createdAt>after.time||(e.createdAt===after.time&&e.eventId>after.id)));
    const merged=[...d1Events,...additional].sort(compare),page=merged.slice(0,50),last=page.at(-1);
    const d1Latest=checks[0]?{...JSON.parse(checks[0].payload),createdAt:checks[0].createdAt} as SavedLegalEvent:null;
    const latest=[...(d1Latest?[d1Latest]:[]),...curated].sort(compare).at(-1)??null;
    return Response.json({events:page,latestCheck:latest,nextCursor:merged.length>50&&last?btoa(JSON.stringify({time:last.createdAt,id:last.eventId})):null},{headers});
  }catch{return Response.json({error:"法規更新暫時無法讀取；請先參考題目內的核對日期。"},{status:503,headers});}
}

export async function POST(){
  return Response.json({error:"法規更新須經核對後由網站版本發布，不接受公開寫入。"},{status:403,headers});
}
