import assert from 'node:assert/strict';
import fs from 'node:fs';
import {isAnswerCorrect,answerLabel} from '../lib/grading.ts';
import {TOPICS,LAWS} from '../lib/study-data.ts';

const years=[110,111,112,113,114,115], tracks=['inner','outer'];
const ids=new Set(), topics=new Set(TOPICS.map(t=>t.id)), laws=new Set(LAWS.map(l=>l.id));
const norm=x=>x.normalize('NFKC').replace(/[^\p{L}\p{N}]/gu,'');
let questions=0, essays=0, changed=0, review=0;
for(const year of years) for(const track of tracks){
 const name=`${year}-${track}`, expectedTrack=track==='inner'?'內軌':'外軌';
 const p=JSON.parse(fs.readFileSync(new URL(`../lib/past-papers/law-${name}.json`,import.meta.url),'utf8'));
 assert.equal(p.meta.year,year,name);assert.equal(p.meta.track,expectedTrack,name);
 assert(p.meta.subject.startsWith('警察法規'),name);assert.equal(p.questions.length,25,name);assert.equal(p.essays.length,2,name);
 assert.equal(p.meta.selectionCount,p.questions.length,name);assert.equal(p.meta.essayCount,p.essays.length,name);
 for(const key of ['indexUrl','questionUrl','answerUrl']) assert(p.meta[key]?.startsWith('https://wwwq.moex.gov.tw/'),`${name}: ${key}`);
 const source=fs.readFileSync(new URL(`../public/exam-papers/law/${year}/${track}/answer.txt`,import.meta.url),'utf8');
 const questionSource=norm(fs.readFileSync(new URL(`../public/exam-papers/law/${year}/${track}/question.txt`,import.meta.url),'utf8'));
 const official=source.split(/\r?\n/).filter(line=>/^答案\s/.test(line.trim())).flatMap(line=>line.match(/\b[A-D]\b/g)??[]).map(x=>x.charCodeAt(0)-65);
 assert.equal(official.length,25,`${name}: initial answer count`);
 for(const [i,q] of p.questions.entries()){
  const label=`${name} #${i+1}`;questions++;
  assert.equal(q.subject,'警察法規',label);assert.equal(q.paperSubject,'警察法規',label);
  assert.equal(q.paperYear,year,label);assert.equal(q.paperTrack,expectedTrack,label);assert.equal(q.paperNumber,i+1,label);
  assert(!ids.has(q.id),`${label} duplicate id`);ids.add(q.id);assert(topics.has(q.topic),`${label} topic ${q.topic}`);
  assert.equal(q.answer,official[i],`${label} original answer`);assert(q.stem?.trim(),label);assert(q.title?.trim(),label);
  assert(questionSource.includes(norm(q.stem)),`${label} original stem transcription`);
  assert.equal(q.options.length,4,label);assert.equal(typeof q.verified,'boolean',label);
  for(const [n,o] of q.options.entries()){
   assert(o.text?.trim(),`${label} ${n} text`);assert(questionSource.includes(norm(o.text)),`${label} option ${n} original transcription`);assert(o.explanation?.trim(),`${label} ${n} explanation`);assert(o.correction?.trim(),`${label} ${n} correction`);assert.equal(typeof o.trueStatement,'boolean',`${label} ${n} trueStatement`);
  }
  assert(Array.isArray(q.lawIds),label);for(const id of q.lawIds)assert(laws.has(id),`${label} unknown law id ${id}`);
  assert(['none','changed','review'].includes(q.amendment?.status),`${label} status`);assert(q.amendment.note?.trim(),label);assert(q.amendment.checkedAt,label);
  if(q.amendment.effectiveStatus)assert(['in-force','announced','mixed','unverified'].includes(q.amendment.effectiveStatus),`${label} effective status`);
  if(q.amendment.status==='changed') {changed++;assert(q.amendment.sources?.length,`${label} amendment sources`);}
  if(q.amendment.status==='review') review++;
  assert(q.sources?.some(s=>s.url===p.meta.questionUrl),`${label} source`);
 }
 for(const [i,e] of p.essays.entries()){
  const label=`${name} essay #${i+1}`;essays++;
  assert.equal(e.subject,'警察法規',label);assert.equal(e.paperYear,year,label);assert.equal(e.paperTrack,expectedTrack,label);assert.equal(e.paperNumber,i+1,label);
  assert(!ids.has(e.id),`${label} duplicate id`);ids.add(e.id);assert(topics.has(e.topic),`${label} topic`);
  assert(e.prompt?.trim(),label);assert(questionSource.includes(norm(e.prompt)),`${label} original prompt transcription`);assert(e.points>0,label);assert.equal(e.points,e.allocation.reduce((n,a)=>n+a.points,0),label);
  for(const f of ['intro','basis','analysis','conclusion']) assert(e.model[f]?.trim(),`${label} ${f}`);
  assert(['none','changed','review'].includes(e.amendment?.status),label);assert(e.amendment.note?.trim(),label);assert(e.amendment.checkedAt,label);
  if(e.amendment.effectiveStatus)assert(['in-force','announced','mixed','unverified'].includes(e.amendment.effectiveStatus),`${label} effective status`);
  for(const id of e.lawIds)assert(laws.has(id),`${label} unknown law id ${id}`);
 }
}
const correctionCases=[['111-inner',24,[1,3]],['112-outer',7,[0,1]],['113-inner',19,[1,2]],['113-outer',12,'all'],['114-inner',10,'all'],['114-inner',14,[0,1]],['114-inner',15,[1,3]],['114-inner',23,[0,1]]];
for(const [paper,num,ans] of correctionCases){
 const p=JSON.parse(fs.readFileSync(new URL(`../lib/past-papers/law-${paper}.json`,import.meta.url),'utf8'));
 const q=p.questions[num-1];assert(q.correctionNote,`${paper} #${num} correction note`);
 if(ans==='all'){assert(q.creditedAll,`${paper} #${num} creditedAll`);assert.equal(answerLabel(q),'一律給分');for(const i of [0,1,2,3])assert(isAnswerCorrect(q,[i]));continue;}
 assert.deepEqual(q.acceptedAnswers,ans,`${paper} #${num} correction`);
 for(const i of [0,1,2,3]) assert.equal(isAnswerCorrect(q,[i]),ans.includes(i));
}
console.log(JSON.stringify({papers:years.length*tracks.length,questions,optionAnalyses:questions*4,essays,initialAnswers:questions,changedQuestionNotes:changed,reviewQuestionNotes:review,officialCorrectionTests:correctionCases.length}));
