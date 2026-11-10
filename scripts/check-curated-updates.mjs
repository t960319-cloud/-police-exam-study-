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
console.log(JSON.stringify({events:events.length,historyTargets:ids.size,scenarioCorrection:'scene114-12',officialAnswer:'D'}));
