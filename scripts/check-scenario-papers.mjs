import assert from 'node:assert/strict';
import fs from 'node:fs';
import { isAnswerCorrect } from '../lib/grading.ts';
const years=[110,111,112,113,114,115],ids=new Set();let changed=0,review=0;
for(const year of years){
 const p=JSON.parse(fs.readFileSync(new URL(`../lib/past-papers/scenario-${year}.json`,import.meta.url),'utf8'));
 assert.equal(p.meta.year,year);assert.equal(p.meta.track,'內軌');assert(p.meta.subject.startsWith('警察情境'));assert.equal(p.questions.length,20);assert.equal(p.essays.length,3);
 const source=fs.readFileSync(new URL(`../public/exam-papers/scenario/${year}/answer.txt`,import.meta.url),'utf8');
 const official=source.split(/\r?\n/).filter(line=>/^答案\s/.test(line.trim())).flatMap(line=>line.match(/\b[A-D]\b/g)??[]).map(x=>x.charCodeAt(0)-65);assert.equal(official.length,20);
 for(const [i,q]of p.questions.entries()){
  assert.equal(q.paperYear,year);assert.equal(q.paperNumber,i+1);assert.equal(q.subject,'警察情境實務');assert.equal(q.paperTrack,'內軌');assert(!ids.has(q.id));ids.add(q.id);assert.equal(q.answer,official[i],`${year} #${i+1} initial answer`);assert.equal(q.options.length,4);
  for(const o of q.options){assert(o.text.trim());assert(o.explanation.trim());assert(o.correction.trim());assert.equal(typeof o.trueStatement,'boolean');}
  assert(['none','changed','review'].includes(q.amendment?.status));assert(q.amendment.note.trim());if(q.amendment.status==='changed'){changed++;assert(q.amendment.sources.length);}if(q.amendment.status==='review')review++;
 }
 for(const e of p.essays){assert.equal(e.points,20);assert.equal(e.points,e.allocation.reduce((n,a)=>n+a.points,0));assert(!ids.has(e.id));ids.add(e.id);assert(e.prompt.trim());assert(e.amendment?.note.trim());for(const f of ['intro','basis','analysis','conclusion'])assert(e.model[f].trim());}
}
const p110=JSON.parse(fs.readFileSync(new URL('../lib/past-papers/scenario-110.json',import.meta.url),'utf8'));
const q14=p110.questions[13];assert.deepEqual(q14.acceptedAnswers,[0,1,3]);assert.equal(q14.acceptedCombinations.length,7);assert(q14.correctionNote.includes('給分'));
for(let mask=0;mask<16;mask++){const a=[0,1,2,3].filter(i=>mask&(1<<i));assert.equal(isAnswerCorrect(q14,a),a.length>0&&!a.includes(2));}
const p111=JSON.parse(fs.readFileSync(new URL('../lib/past-papers/scenario-111.json',import.meta.url),'utf8'));assert.deepEqual(p111.questions[14].acceptedAnswers,[1,2]);assert(p111.questions[14].correctionNote);
console.log(JSON.stringify({papers:6,mcq:120,optionAnalyses:480,essays:18,officialInitialAnswers:120,changedQuestionNotes:changed,reviewQuestionNotes:review,specialCreditCombinations:7}));
