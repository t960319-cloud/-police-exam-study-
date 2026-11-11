"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { applyLegalEvents, type SavedLegalEvent } from "./legal-updates";
import type { Essay, Law, Question } from "./study-data";

const KEY="police-legal-updates-v1";
export function useLegalUpdates(questions:Question[],essays:Essay[],laws:Law[]){
  const [events,setEvents]=useState<SavedLegalEvent[]>([]),[latestCheck,setLatestCheck]=useState<SavedLegalEvent|null>(null),[status,setStatus]=useState<"loading"|"synced"|"offline">("loading");
  const refresh=useCallback(async()=>{
    try{
      const all:SavedLegalEvent[]=[];let cursor:string|null=null;let check:SavedLegalEvent|null=null;
      do{const r:Response=await fetch(`/api/legal-updates${cursor?`?cursor=${encodeURIComponent(cursor)}`:""}`,{cache:"no-store"});if(!r.ok)throw new Error("read");const data:{events:SavedLegalEvent[];latestCheck:SavedLegalEvent|null;nextCursor:string|null}=await r.json();all.push(...data.events);check=data.latestCheck;cursor=data.nextCursor;}while(cursor);
      setEvents(all);setLatestCheck(check);setStatus("synced");try{localStorage.setItem(KEY,JSON.stringify({events:all,latestCheck:check}));}catch{/* Current response remains usable. */}
    }catch{setStatus("offline");}
  },[]);
  useEffect(()=>{try{const cache=JSON.parse(localStorage.getItem(KEY)||"null");if(Array.isArray(cache?.events)){setEvents(cache.events);setLatestCheck(cache.latestCheck??null);}}catch{}void refresh();const visible=()=>{if(document.visibilityState==="visible")void refresh();};document.addEventListener("visibilitychange",visible);window.addEventListener("online",refresh);const timer=setInterval(()=>void refresh(),300000);return()=>{document.removeEventListener("visibilitychange",visible);window.removeEventListener("online",refresh);clearInterval(timer);};},[refresh]);
  const content=useMemo(()=>applyLegalEvents(questions,essays,events,laws),[questions,essays,events,laws]);
  return {...content,events,latestCheck,status,refresh};
}
