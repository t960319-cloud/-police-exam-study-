import assert from 'node:assert/strict';
import fs from 'node:fs';
const years=[110,111,112,113,114,115],ids=new Set();let options=0,changed=0,review=0;
for(const year of years){
 const paper=JSON.parse(fs.readFileSync(new URL(`../lib/past-papers/duty-${year}.json`,import.meta.url),'utf8'));
 assert.equal(paper.meta.year,year);assert.equal(paper.meta.track,'內軌');assert.equal(paper.questions.length,25);assert.equal(paper.essays.length,2);
 const source=fs.readFileSync(new URL(`../public/exam-papers/${year}/answer.txt`,import.meta.url),'utf8');
 const official=source.split(/\r?\n/).filter(line=>/^答案\s/.test(line.trim())).flatMap(line=>line.match(/\b[A-D]\b/g)??[]).map(x=>x.charCodeAt(0)-65);assert.equal(official.length,25);
 for(const [i,q]of paper.questions.entries()){
  assert.equal(q.paperNumber,i+1);assert.equal(q.paperYear,year);assert.equal(q.paperTrack,'內軌');assert(!ids.has(q.id));ids.add(q.id);assert.equal(q.options.length,4);assert.equal(q.answer,official[i],`${year} #${i+1}`);
  assert.deepEqual(q.acceptedAnswers??[q.answer],year===113&&i===0?[0,1,2,3]:year===114&&i===6?[1,2]:[official[i]]);
  for(const o of q.options){assert(o.text.trim());assert(o.explanation.trim());assert(o.correction.trim());assert.equal(typeof o.trueStatement,'boolean');options++;}
  assert(['changed','review','none'].includes(q.amendment?.status));assert(q.amendment.note.trim());if(q.amendment.status==='changed'){changed++;assert(q.amendment.sources.length>0);}if(q.amendment.status==='review')review++;
 }
 for(const e of paper.essays){assert(!ids.has(e.id));ids.add(e.id);assert.equal(e.points,e.allocation.reduce((n,p)=>n+p.points,0));assert(e.prompt);for(const k of ['intro','basis','analysis','conclusion'])assert(e.model[k].trim());assert(e.amendment?.note);}
}
const ext=JSON.parse(fs.readFileSync(new URL('../lib/past-papers/external-scope.json',import.meta.url),'utf8'));assert.deepEqual(ext.map(p=>p.year),years);for(const p of ext){assert.equal(p.hasDutySubject,false);assert(p.subjects.length);assert(!p.subjects.some(s=>s.includes('警察勤務')));}
console.log(JSON.stringify({papers:6,mcq:150,optionAnalyses:options,essays:12,changedQuestionNotes:changed,reviewQuestionNotes:review,officialAnswerChecks:150,externalDutyPapers:0}));
