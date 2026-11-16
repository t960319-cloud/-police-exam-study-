import assert from 'node:assert/strict';
import fs from 'node:fs';
import {QUESTIONS,ESSAYS,LAWS} from '../lib/study-data.ts';
import {validateLegalEvent,applyLegalEvents} from '../lib/legal-updates.ts';
const events=JSON.parse(fs.readFileSync(new URL('../lib/curated-updates.json',import.meta.url),'utf8'));
const folder=new URL('../lib/past-papers/',import.meta.url);
const papers=fs.readdirSync(folder).filter(n=>/^(duty|scenario|law|investigation)-.*\.json$/.test(n)).map(n=>JSON.parse(fs.readFileSync(new URL(n,folder),'utf8')));
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
// Keep the three distinct sampling safeguards separate in the study material.
const urine=result.laws.find(l=>l.id==='p2052');assert(urine);
assert(urine.points.some(p=>p.includes('24小時')));assert(urine.points.some(p=>p.includes('3日')));assert(urine.points.some(p=>p.includes('10日')));
const permit=result.laws.find(l=>l.id==='p2053');assert(permit);assert(permit.original.includes('許可書，由檢察官簽名'));assert(permit.original.includes('應出示許可書及可證明其身分之文件'));
const remedy=result.laws.find(l=>l.id==='p2054');assert(remedy);assert(remedy.original.includes('自採取之日起算'));assert(remedy.original.includes('不得抗告'));
const blood=result.questions.find(q=>q.id==='q38');assert(blood);assert.equal(blood.answer,1);assert(blood.amendment.note.includes('原答案B不變'));assert(blood.amendment.sources.some(s=>s.url.includes('K0040012')));assert(blood.amendment.effectiveDate.includes('115.12.31'));
const urineEssay=result.essays.find(e=>e.id==='s08');assert(urineEssay);assert(urineEssay.model.analysis.includes('許可書'));assert(urineEssay.model.analysis.includes('10日'));assert(urineEssay.model.analysis.includes('不得抗告'));
console.log('Sampling permits, 24h/3d/10d distinctions, court remedy and unchanged blood-question answer passed.');
// A repealed regulation must never be presented as a verified current basis.
for(const id of ['e6','e11']){const law=result.laws.find(l=>l.id===id);assert(law);assert.equal(law.verified,false);assert(law.originalLabel.includes('歷史資料'));assert(law.amendment.note.includes('廢止'));assert(law.amendment.sources.some(s=>s.url.includes('LawHistory.aspx?pcode=I0040007')));}
for(const id of ['q14','q15','q16','duty112_09','duty113_21','scene114-14']){const q=result.questions.find(q=>q.id===id);assert(q);assert.equal(q.verified,false);assert(q.currentAnswer.includes('保留原題'));}
const escortEssay=result.essays.find(e=>e.id==='s05');assert(escortEssay);assert.equal(escortEssay.verified,false);assert(escortEssay.model.basis.includes('110.12.13廢止'));
console.log('Repealed escort regulation stays historical; linked exercises cannot be marked current/verified.');
// A source-backed law card may be verified without silently clearing every linked exercise.
const missing=result.laws.find(l=>l.id==='missing');assert(missing);
assert.equal(missing.verified,true);
assert(missing.core.includes('六類例外'));
assert(missing.points.some(p=>p.includes('24小時')&&p.includes('疑涉刑案')));
assert(missing.points.some(p=>p.includes('7日')&&p.includes('每3個月')&&p.includes('3年以上')));
assert(missing.points.some(p=>p.includes('不願配合撤尋')&&p.includes('尊重')));
assert(!missing.verificationNote.includes('未取得完整最新版原件'));
const missingEssay=result.essays.find(e=>e.id==='s03');assert(missingEssay);
assert.equal(missingEssay.verified,false);
assert(missingEssay.model.basis.includes('完整18點'));
assert.equal(missingEssay.prompt,ESSAYS.find(e=>e.id==='s03').prompt);
console.log('Missing-person source review preserves conditional deadlines, withdrawal exceptions and separate essay verification.');

// Official missing-person rules: retain historical keys and the limits on children and follow-up.
const missingLaw=result.laws.find(l=>l.id==='missing');assert(missingLaw);assert(missingLaw.verified);assert(missingLaw.sources.some(s=>s.url.endsWith('/F1000200')));assert(missingLaw.points.some(p=>p.includes('7日內')&&p.includes('3個月')&&p.includes('3年以上')));assert(missingLaw.traps.some(p=>p.includes('24小時不是報案等待期')));
for(const [id,answer] of [['duty112_20',2],['scene115-09',2]]){const q=result.questions.find(q=>q.id===id);assert(q);assert.equal(q.answer,answer);assert(q.verified);assert(q.currentAnswer);}
const familyCase=result.questions.find(q=>q.id==='scene113-04');assert(familyCase);assert.equal(familyCase.answer,0);assert.equal(familyCase.verified,false);assert(familyCase.currentAnswer.includes('其他緊急事由')||familyCase.currentAnswer.includes('急迫事由'));
const missingEssayFollowup=result.essays.find(e=>e.id==='s03');assert(missingEssayFollowup);assert(missingEssayFollowup.model.analysis.includes('7日內'));assert(missingEssayFollowup.model.analysis.includes('每3個月'));assert(missingEssayFollowup.model.analysis.includes('每年1次'));
console.log('Official missing-person cases, family exception, follow-up and original answers passed.');
// Restraints and repeal have distinct scopes; an old escort regulation cannot be cited as current.
const restraint=result.laws.find(l=>l.id==='escort-constraints');assert(restraint);assert(restraint.sources.some(s=>s.url.includes('I0030058')));assert(restraint.points.some(x=>x.includes('少年')&&x.includes('原則不應使用')));assert(restraint.points.some(x=>x.includes('即將生產')&&x.includes('不應使用')));assert(restraint.traps.some(x=>x.includes('不代表每個人均應上銬')));
const currentEscort=result.essays.find(e=>e.id==='scene115-e2');assert(currentEscort);assert(currentEscort.model.basis.includes('110.12.13廢止'));assert(currentEscort.model.analysis.includes('不得將此理解為員警得等待24小時才解送'));assert.equal(currentEscort.verified,false);
const minorEscort=result.questions.find(q=>q.id==='duty113_21');assert(minorEscort);assert.equal(minorEscort.answer,3);assert(minorEscort.currentAnswer.includes('第3條'));assert.equal(minorEscort.verified,false);
console.log('Restraint protections, repeal distinction, immediate transfer and original escort answer passed.');
// Distinguish the 2022 explanatory article from the yet-unobtained current SOP.
const chaseLaw=result.laws.find(l=>l.id==='chase');assert(chaseLaw);assert.equal(chaseLaw.verified,false);assert(chaseLaw.points.some(p=>p.includes('第7條之2')&&p.includes('不能或不宜攔截')));assert(chaseLaw.traps.some(p=>p.includes('並非最新SOP全文')));
const chaseEssay=result.essays.find(e=>e.id==='duty111_s01');assert(chaseEssay);assert.equal(chaseEssay.verified,false);assert(chaseEssay.model.analysis.includes('單憑逃逸或慌張不當然構成現行犯'));assert(chaseEssay.model.analysis.includes('最新完整SOP'));
console.log('Chase legal basis, safety limits and unresolved SOP version passed.');
// A refusal warning is still required; consensual sampling is separate from compelled sampling.
const bloodConsent=result.questions.find(q=>q.id==='duty113_04');assert(bloodConsent);assert.equal(bloodConsent.answer,2);assert(bloodConsent.currentAnswer.includes('受測者同意'));assert.equal(bloodConsent.verified,false);
const breathNotice=result.questions.find(q=>q.id==='duty114_06');assert(breathNotice);assert.equal(breathNotice.answer,2);assert(breathNotice.options[2].correction.includes('拒測應告知法律效果'));assert.equal(breathNotice.verified,false);
const oldBlood=result.questions.find(q=>q.id==='scene110-17');assert(oldBlood);assert.equal(oldBlood.answer,1);assert.equal(oldBlood.verified,false);assert(oldBlood.currentAnswer.includes('本人同意'));
console.log('Consent, refusal notification, phased enactment and original blood-question answers passed.');
// Historical exam answers do not establish the missing national rules' current full text.
for(const [id,key] of [['investigation114_01',3],['investigation115_02',3]]){const q=result.questions.find(q=>q.id===id);assert(q);assert.equal(q.answer,key);assert.equal(q.verified,false);assert.equal(q.amendment.status,'review');assert.notEqual(q.analysisMode,'answer-key');assert(q.currentAnswer.includes('官方'));assert(q.options.every(o=>o.explanation.length>12&&o.correction.length>12));}
console.log('Investigation option explanations retain official keys and unresolved national-rule status.');
// Specific statutes must preserve original keys and distinguish court-approved GPS investigations from short-term notices.
for(const [id,answer] of [['investigation115_05',3],['investigation114_25',3],['investigation115_14',3],['investigation115_24',3]]){
 const q=result.questions.find(q=>q.id===id);assert(q);assert.equal(q.answer,answer);assert.equal(q.verified,true);assert.notEqual(q.analysisMode,'answer-key');assert(q.amendment.sources.length);assert(q.options.every(o=>o.explanation.trim()&&o.correction.trim()&&!o.explanation.includes('本項不在當年度官方接受答案')));
}
const informant=result.questions.find(q=>q.id==='investigation115_05');assert(informant.options[1].explanation.includes('應予保密'));
const youth=result.questions.find(q=>q.id==='investigation114_25');assert(youth.options[3].explanation.includes('例外'));
const domestic=result.questions.find(q=>q.id==='investigation115_14');assert(domestic.currentAnswer.includes('立即通報'));assert(domestic.currentAnswer.includes('24小時'));
const gpsPeriod=result.questions.find(q=>q.id==='investigation115_24');assert(gpsPeriod.currentAnswer.includes('不足24小時以1日計'));assert(gpsPeriod.currentAnswer.includes('期滿2日前'));
const gpsNotice=result.questions.find(q=>q.id==='investigation115_25');assert.equal(gpsNotice.answer,1);assert.equal(gpsNotice.verified,false);assert.notEqual(gpsNotice.analysisMode,'answer-key');assert(gpsNotice.currentAnswer.includes('法院許可或補發許可'));assert(gpsNotice.currentAnswer.includes('短期追蹤'));
const passenger=result.questions.find(q=>q.id==='duty112_24');assert.equal(passenger.answer,1);assert.equal(passenger.verified,false);assert(passenger.currentAnswer.includes('駕駛人測得'));assert(passenger.currentAnswer.includes('30日內'));
console.log('Statute-backed options, GPS notice branches, passenger prerequisites and original answers passed.');
