import assert from 'node:assert/strict';
import fs from 'node:fs';
import {QUESTIONS,ESSAYS,LAWS} from '../lib/study-data.ts';
import {validateLegalEvent,applyLegalEvents} from '../lib/legal-updates.ts';
const events=JSON.parse(fs.readFileSync(new URL('../lib/curated-updates.json',import.meta.url),'utf8'));
const folder=new URL('../lib/past-papers/',import.meta.url);
const papers=fs.readdirSync(folder).filter(n=>/^(duty|scenario|law)-.*\.json$/.test(n)).map(n=>JSON.parse(fs.readFileSync(new URL(n,folder),'utf8')));
const ALL_QUESTIONS=[...QUESTIONS,...papers.flatMap(p=>p.questions)],ALL_ESSAYS=[...ESSAYS,...papers.flatMap(p=>p.essays)];
const ids=new Set([...ALL_QUESTIONS,...ALL_ESSAYS,...LAWS].map(x=>x.id));
const eventIds=new Set();let previous=0;
for(const e of events){
 assert(validateLegalEvent(e,ids),`invalid legal event ${e.eventId}`);
 assert(!eventIds.has(e.eventId),`duplicate legal event ${e.eventId}`);eventIds.add(e.eventId);
 assert(Number.isSafeInteger(e.createdAt)&&e.createdAt>previous,`event timestamp ${e.eventId}`);previous=e.createdAt;
}
const event=events.find(e=>e.eventId==='legal-correction-20261110-thirdparty-12');assert(event);
const result=applyLegalEvents(ALL_QUESTIONS,ALL_ESSAYS,events,LAWS);
const corrected=result.questions.find(q=>q.id==='scene114-12');assert(corrected);
assert(corrected.options[1].correction.includes('警察分局長'));assert(corrected.options[2].correction.includes('1次'));
assert.equal(corrected.answer,3);assert.equal(corrected.options.length,4);
const q111=result.questions.find(q=>q.id==='law111-outer-23');assert(q111);
assert.equal(q111.answer,2);assert(q111.options[2].explanation.includes('第13條'));assert(q111.options[0].explanation.includes('忠誠度'));
const q112=result.questions.find(q=>q.id==='law112-inner-20');assert(q112);
assert.equal(q112.answer,2);assert(q112.options[3].explanation.includes('期滿前報准'));assert(q112.options[3].explanation.includes('工作結束後'));
const q113=result.questions.find(q=>q.id==='law113-inner-02');assert(q113);
assert.equal(q113.answer,2);assert(q113.options[2].explanation.includes('任何名義及證明文件'));
const noise=result.laws.find(l=>l.id==='so72');assert(noise);assert(noise.traps.some(x=>x.includes('條次未同步')));
const essay=result.essays.find(e=>e.id==='scene114-e1');assert(essay);assert(essay.amendment.note.includes('正式解釋待核'));
console.log(JSON.stringify({events:events.length,historyTargets:ids.size,scenarioCorrection:'scene114-12',officialAnswer:'D'}));
