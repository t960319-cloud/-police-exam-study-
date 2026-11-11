import assert from 'node:assert/strict';
import fs from 'node:fs';
import {isAnswerCorrect, answerLabel} from '../lib/grading.ts';
import {TOPICS} from '../lib/study-data.ts';

const years=[110,111,112,113,114,115], topics=new Set(TOPICS.map(t=>t.id)), ids=new Set();
const norm=s=>s.normalize('NFKC').replace(/[^\p{L}\p{N}]/gu,'');
let count=0,stable=0;
for(const year of years){
 const paper=JSON.parse(fs.readFileSync(new URL(`../lib/past-papers/investigation-${year}.json`,import.meta.url),'utf8'));
 const source=norm(fs.readFileSync(new URL(`../public/exam-papers/investigation/${year}/question.txt`,import.meta.url),'utf8'));
 const answers=fs.readFileSync(new URL(`../public/exam-papers/investigation/${year}/answer.txt`,import.meta.url),'utf8');
 const initial=answers.match(/原始答案：([A-D]{50})/)[1];
 const final=answers.match(/\n答案 ([A-D# ]+)\n/)[1].replaceAll(' ','');
 assert.equal(paper.meta.year,year);assert.equal(paper.meta.track,'內軌');assert.equal(paper.meta.subject,'犯罪偵查概要');
 assert.equal(paper.meta.selectionCount,50);assert.equal(paper.questions.length,50);assert.equal(paper.meta.essayCount,0);assert.equal(paper.essays.length,0);assert.equal(final.length,50);
 for(const [i,q]of paper.questions.entries()){
  const label=`${year} #${i+1}`;count++;
  assert.equal(q.paperNumber,i+1,label);assert.equal(q.paperYear,year,label);assert.equal(q.paperTrack,'內軌',label);assert.equal(q.paperSubject,'犯罪偵查',label);assert.equal(q.subject,'犯罪偵查',label);
  assert(!ids.has(q.id),label);ids.add(q.id);assert(topics.has(q.topic),`${label}: unknown topic`);
  assert.equal(q.answer,initial.charCodeAt(i)-65,`${label}: initial answer`);
  assert(source.includes(norm(q.stem)),`${label}: stem transcription`);assert(!q.stem.includes('[MISSING'),label);assert.equal(q.options.length,4,label);
  for(const o of q.options){assert(source.includes(norm(o.text)),`${label}: option transcription`);assert(o.text.trim());assert(o.explanation.trim());assert(o.correction.trim());}
  assert(q.takeaway.trim(),label);assert(q.amendment.note.trim(),label);assert(q.sources.some(s=>s.url===paper.meta.questionUrl),label);
  if(final[i]!=='#')assert(isAnswerCorrect(q,[final.charCodeAt(i)-65]),`${label}: final answer`);
  if(!q.correctionNote){assert.notEqual(final[i],'#',`${label}: missing correction`);assert.equal(initial[i],final[i],`${label}: unexplained key change`);}
  if(q.verified){stable++;assert.equal(q.amendment.status,'none',label);}
 }
}
const load=y=>JSON.parse(fs.readFileSync(new URL(`../lib/past-papers/investigation-${y}.json`,import.meta.url),'utf8'));
for(const [year,n]of [[112,7],[114,3],[115,16]]){
 const q=load(year).questions[n-1];assert(q.creditedAll);assert.equal(answerLabel(q),'一律給分');for(let i=0;i<4;i++)assert(isAnswerCorrect(q,[i]));assert(!isAnswerCorrect(q,[]));assert(!isAnswerCorrect(q,[0,1]));
}
const q49=load(114).questions[48];assert.deepEqual(q49.acceptedAnswers,[0,2,3]);for(let i=0;i<4;i++)assert.equal(isAnswerCorrect(q49,[i]),i!==1);assert(!isAnswerCorrect(q49,[0,2]));
const q4=load(115).questions[3];assert.equal(q4.initialAnswer,0);assert.deepEqual(q4.acceptedAnswers,[2]);assert(!isAnswerCorrect(q4,[0]));assert(isAnswerCorrect(q4,[2]));
assert(load(110).questions[0].figure.url.endsWith('#page=1'));
const external=JSON.parse(fs.readFileSync(new URL('../lib/past-papers/external-scope.json',import.meta.url),'utf8'));
assert.equal(external.length,6);for(const e of external){assert.equal(e.hasInvestigationSubject,false);assert(e.subjects.includes('犯罪學概要'));assert(!e.subjects.includes('犯罪偵查概要'));}
for(const file of fs.readdirSync(new URL('../lib/past-papers',import.meta.url)).filter(f=>f.endsWith('.json')&&!f.startsWith('investigation-'))){
 const p=JSON.parse(fs.readFileSync(new URL(`../lib/past-papers/${file}`,import.meta.url),'utf8'));for(const item of [...p.questions??[],...p.essays??[]])assert(!ids.has(item.id),`duplicate existing id ${item.id}`);
}
const registry=fs.readFileSync(new URL('../lib/past-exams.ts',import.meta.url),'utf8');for(const y of years){assert(registry.includes(`import i${y} from "./past-papers/investigation-${y}.json"`));assert(registry.includes(`i${y}`));}
console.log(JSON.stringify({papers:6,questions:count,transcribedOptions:count*4,officialCorrections:5,allCredit:3,multipleAcceptedSingleAnswers:1,replacedAnswer:1,stableConceptQuestions:stable,externalSubjectAbsent:6,figureReferences:1}));
