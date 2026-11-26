import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {QUESTIONS,ESSAYS,LAWS} from '../lib/study-data.ts';
import {applyLegalEvents,validateLegalEvent} from '../lib/legal-updates.ts';
import {needsLegalReview} from '../lib/study-priorities.ts';

const read=path=>JSON.parse(fs.readFileSync(new URL(path,import.meta.url),'utf8'));
const evidence=read('../docs/legal-evidence-2026-11-26-verify60.json');
const events=read('../lib/curated-updates.json');
const folder=new URL('../lib/past-papers/',import.meta.url);
const papers=fs.readdirSync(folder).filter(n=>/^(duty|scenario|law|investigation)-.*\.json$/.test(n)).map(n=>JSON.parse(fs.readFileSync(new URL(n,folder),'utf8')));
const raw={questions:[...QUESTIONS,...papers.flatMap(p=>p.questions)],essays:[...ESSAYS,...papers.flatMap(p=>p.essays)],laws:LAWS};
const result=applyLegalEvents(raw.questions,raw.essays,events,raw.laws);
const allIds=new Set([...raw.questions,...raw.essays,...raw.laws].map(q=>q.id));
const canonical=value=>JSON.stringify(value,(_key,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);
const hash=value=>createHash('sha256').update(canonical(value)).digest('hex');
const omit=(obj,keys)=>Object.fromEntries(Object.entries(obj).filter(([key])=>!keys.includes(key)));
function originalHash(q,essay){
 const data=omit(q,essay?['verified','amendment','sources','model']:['verified','analysisMode','currentAnswer','takeaway','amendment','sources','options']);
 if(!essay)data.options=q.options.map(o=>omit(o,['explanation','correction','index']));
 return hash(data);
}
const added=events.filter(e=>evidence.eventIds.includes(e.eventId));
assert.equal(events.length,54);assert.equal(added.length,2);
assert.deepEqual(added.map(e=>e.eventId),['a','b'].map(s=>'legal-review-20261126-verify60-'+s));
assert.deepEqual(added.map(e=>e.patches.length),[31,31]);
assert.equal(hash(events.slice(0,52)),evidence.preservedCuratedCanonicalSha256);
assert.equal(evidence.preservedCuratedEvents,52);assert.equal(evidence.preservedProductionEvents,55);
const patches=added.flatMap(e=>e.patches),ids=new Set(patches.map(p=>p.targetId));
assert.equal(patches.length,62);assert.equal(ids.size,62);
assert.equal(patches.filter(p=>p.optionOverrides).length,60);
assert.equal(patches.reduce((n,p)=>n+(p.optionOverrides?.length??0),0),240);
assert.equal(patches.filter(p=>p.model).length,2);
assert(added.every(e=>validateLegalEvent(e,allIds)));
assert(validateLegalEvent({...added[0],patches:patches.slice(0,40)},allIds));
assert.equal(validateLegalEvent({...added[0],patches:patches.slice(0,41)},allIds),false);
assert.equal(validateLegalEvent({...added[0],sources:Array(31).fill(added[0].sources[0])},allIds),false);
assert.equal(validateLegalEvent({...added[0],sources:[{title:'Technical reference',url:'https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-86.pdf'}]},allIds),false);
assert.deepEqual(evidence.targets.toSorted(),patches.filter(p=>p.optionOverrides).map(p=>p.targetId).sort());
assert.deepEqual(evidence.essayTargets.toSorted(),patches.filter(p=>p.model).map(p=>p.targetId).sort());
assert.equal(evidence.reviewResults.length,62);
for(const audit of evidence.reviewResults){
 const essay=audit.kind==='essay',q=result[essay?'essays':'questions'].find(q=>q.id===audit.targetId),p=patches.find(p=>p.targetId===audit.targetId);
 assert(q&&p,audit.targetId);assert.equal(q.verified,true);assert.equal(p.verified,true);
 assert.equal(originalHash(q,essay),audit.originalInvariantHash,audit.targetId+': original wording and grading');
 assert.equal(q.amendment.checkedAt,'2026-11-26');assert(['none','changed'].includes(q.amendment.status));assert.notEqual(q.amendment.effectiveStatus,'unverified');
 assert.equal(q.amendment.status,audit.amendmentStatus);assert(audit.closedGap.trim());assert(audit.sources.length>0);
 if(essay){assert.deepEqual(q.model,p.model);assert.equal(q.points,25);assert.equal(q.points,q.allocation.reduce((n,a)=>n+a.points,0));}
 else{
  assert.notEqual(q.analysisMode,'answer-key');assert.equal(q.options.length,4);
  for(const [index,o]of q.options.entries()){
   assert(o.explanation.trim().length>=12&&o.correction.trim().length>=12);
   assert.equal(o.explanation,p.optionOverrides[index].explanation);assert.equal(o.correction,p.optionOverrides[index].correction);
   assert.equal(o.trueStatement,p.optionOverrides[index].trueStatement);
  }
  assert.equal(q.currentAnswer,p.currentAnswer);assert.equal(q.takeaway,p.takeaway);
 }
}
assert.deepEqual({questionsNotVerified:result.questions.filter(q=>!q.verified).length,essaysNotVerified:result.essays.filter(e=>!e.verified).length,reviewFilter:result.questions.filter(needsLegalReview).length},evidence.counts);
assert.deepEqual(evidence.counts,{questionsNotVerified:137,essaysNotVerified:25,reviewFilter:138});
assert.deepEqual(evidence.inventory,{questions:910,essays:66,laws:33,perOptionAnalyses:910,answerKeyComparisons:0});
assert.equal(result.questions.length,910);assert.equal(result.essays.length,66);assert.equal(result.laws.length,33);
assert.equal(result.questions.filter(q=>q.analysisMode==='answer-key').length,0);assert.equal(evidence.learningDataWrites,0);
const q=id=>result.questions.find(q=>q.id===id),e=id=>result.essays.find(e=>e.id===id);
for(const id of ['law113-outer-12','law114-inner-10']){assert(q(id).creditedAll);assert(q(id).currentAnswer.includes('一律給分'));}
assert.deepEqual(q('law114-inner-15').acceptedAnswers,[1,3]);
assert(q('law114-inner-17').options[0].explanation.includes('50')&&q('law114-inner-17').options[0].explanation.includes('59'));
assert(q('law114-inner-17').options[0].explanation.includes('5年'));
assert(q('investigation114_46').options[3].correction.includes('明確反對'));
assert(q('scene115-14').options[3].explanation.includes('警察人員使用警械致現場人員傷亡'));
assert(q('investigation115_32').options[2].correction.includes('改用其他指紋時'));
assert(e('law110-inner-e2').model.analysis.includes('110年尚不存在'));
assert(e('law110-inner-e2').model.basis.includes('第36、39條'));
assert.equal(e('law110-inner-e2').amendment.status,'changed');
assert(e('law115-outer-e1').model.basis.includes('4604')&&e('law115-outer-e1').model.basis.includes('1684'));
assert(e('law115-outer-e1').model.analysis.includes('時地'));
assert.equal(q('investigation112_28').verified,false,'unselected prepared draft must not be counted');
console.log(JSON.stringify({verifiedQuestions:60,reviewedOptions:240,verifiedEssays:2,unchangedHistoricalEvents:52,counts:evidence.counts,originalTextAndScoringPreserved:true}));
