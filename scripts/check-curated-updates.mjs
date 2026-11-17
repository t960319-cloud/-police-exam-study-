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
// Statutory investigation corrections preserve the historic keys and show all option explanations.
for(const [id,answer] of [['investigation114_06',3],['investigation114_16',0],['investigation114_19',1],['investigation114_39',1],['investigation114_44',1],['investigation114_48',0]]){
 const q=result.questions.find(q=>q.id===id);assert(q);assert.equal(q.answer,answer);assert(q.verified);assert.notEqual(q.analysisMode,'answer-key');assert(q.options.every(o=>o.explanation.trim()&&o.correction.trim()));
}
const night=result.questions.find(q=>q.id==='investigation114_19');assert(night.options[1].correction.includes('明示'));assert(night.amendment.sources.some(s=>s.url.includes('judicial.gov.tw')));
const postmortem=result.questions.find(q=>q.id==='investigation114_48');assert(postmortem.currentAnswer.includes('檢驗應命醫師或檢驗員'));assert(postmortem.currentAnswer.includes('解剖應命醫師'));
console.log('Investigation procedure, night-search consent and forensic examination distinctions passed.');
// Communications timing, records and statutory stalking exceptions must remain distinct.
for(const [id,answer] of [['investigation111_12',3],['investigation111_31',3],['investigation112_10',1],['investigation114_32',3],['investigation114_42',2]]){
 const q=result.questions.find(q=>q.id===id);assert(q);assert.equal(q.answer,answer);assert(q.verified);assert.notEqual(q.analysisMode,'answer-key');assert(q.options.every(o=>o.explanation.trim()&&o.correction.trim()));
}
const urgentMonitoring=result.questions.find(q=>q.id==='investigation112_09');assert.equal(urgentMonitoring.answer,3);assert.equal(urgentMonitoring.verified,false);assert(urgentMonitoring.currentAnswer.includes('24小時'));assert(urgentMonitoring.currentAnswer.includes('48小時'));
const stalking=result.questions.find(q=>q.id==='investigation114_27');assert.equal(stalking.answer,0);assert.equal(stalking.verified,false);assert(stalking.currentAnswer.includes('第3條第2項'));assert(stalking.currentAnswer.includes('性別無關'));
console.log('Communication deadlines and records, arrest-warrant copies, and stalking exceptions passed.');
// Reused statutes across historical years must keep exceptions and the original paper keys.
for(const [id,answer] of [['investigation110_15',0],['investigation110_16',1],['investigation110_29',2],['investigation111_28',0],['investigation111_32',1],['investigation111_38',0],['investigation111_39',3],['investigation111_40',2],['investigation111_47',0],['investigation112_35',2],['investigation113_04',1],['investigation113_19',2],['investigation113_21',2]]){
 const q=result.questions.find(q=>q.id===id);assert(q);assert.equal(q.answer,answer);assert(q.verified);assert.notEqual(q.analysisMode,'answer-key');
}
const informantRenewal=result.questions.find(q=>q.id==='investigation112_08');assert.equal(informantRenewal.answer,1);assert.equal(informantRenewal.verified,false);assert(informantRenewal.options[2].explanation.includes('新發生'));
const nightClass=result.questions.find(q=>q.id==='investigation113_21');assert(nightClass.currentAnswer.includes('本身不在'));assert(nightClass.currentAnswer.includes('其他合法例外'));
const protectedLegislator=result.questions.find(q=>q.id==='investigation110_16');assert(protectedLegislator.currentAnswer.includes('現行犯'));assert(protectedLegislator.currentAnswer.includes('通緝'));
console.log('Cross-year legal explanations preserve exceptions, warrant limits and original exam answers.');
// Essay corrections distinguish the assembly law penalty provisions from damages and explain compensation prerequisites.
const penaltyEssay=result.essays.find(e=>e.id==='law113-inner-e1');assert(penaltyEssay);assert(penaltyEssay.verified);assert(penaltyEssay.model.basis.includes('集會遊行法第3、27、28條'));assert(!penaltyEssay.model.basis.includes('集會遊行法第32條'));assert(penaltyEssay.model.analysis.includes('免予移送'));assert(penaltyEssay.model.analysis.includes('結果發生在後'));
const weaponCompensation=result.essays.find(e=>e.id==='law113-inner-e2');assert(weaponCompensation);assert(weaponCompensation.verified);assert(weaponCompensation.model.analysis.includes('排除該次用械相對人'));assert(weaponCompensation.model.analysis.includes('可歸責'));assert(weaponCompensation.model.analysis.includes('三分之一'));assert(weaponCompensation.amendment.note.includes('不是考選部官方'));
console.log('Essay penalty citations, special transfer period and police-weapons compensation safeguards passed.');
// Historical oversight reports and custody notices cannot be silently substituted for current full rules.
const crossEvidence=result.laws.find(l=>l.id==='cross');assert(crossEvidence);assert.equal(crossEvidence.verified,false);assert(crossEvidence.points.some(x=>x.includes('歷史佐證')));assert(crossEvidence.traps.some(x=>x.includes('不能代替完整內規')));
const oldCross=result.questions.find(q=>q.id==='investigation113_03');assert(oldCross);assert.equal(oldCross.answer,2);assert.equal(oldCross.verified,false);assert.notEqual(oldCross.analysisMode,'answer-key');assert(oldCross.currentAnswer.includes('不能直接'));
const crossAnswer=result.essays.find(e=>e.id==='s10');assert(crossAnswer);assert.equal(crossAnswer.verified,false);assert(crossAnswer.model.basis.includes('完整要點'));
const arrestAnswer=result.essays.find(e=>e.id==='s11');assert(arrestAnswer);assert(arrestAnswer.model.basis.includes('第89條拘捕告知'));assert(arrestAnswer.model.basis.includes('第89條之1另規定戒具'));assert(arrestAnswer.model.analysis.includes('以書面將原因通知本人及其指定親友'));
console.log('Historical cross-jurisdiction evidence and corrected arrest notification citation passed.');
// Police-law exam answers must reflect official compensation guidance and the administrative reorganization notice.
for(const [id,answer] of [['law113-outer-11',1],['law113-outer-18',0],['law114-inner-06',1],['law114-inner-07',0],['law114-outer-04',1],['law114-outer-17',0],['law115-inner-10',0],['law115-inner-12',0],['law115-inner-15',0],['law115-inner-23',0],['law115-outer-16',0],['law115-outer-24',1]]){
 const q=result.questions.find(q=>q.id===id);assert(q);assert.equal(q.answer,answer);assert(q.verified);assert(q.options.every(o=>o.explanation.trim()&&o.correction.trim()));
}
const jointPassenger=result.questions.find(q=>q.id==='law113-outer-11');assert(jointPassenger.currentAnswer.includes('犯意聯絡'));assert(jointPassenger.amendment.sources.some(s=>s.url.includes('ws.moi.gov.tw')));
const reorganized=result.questions.find(q=>q.id==='law114-outer-17');assert(reorganized.currentAnswer.includes('行政執行處'));assert(reorganized.currentAnswer.includes('行政執行分署'));assert(reorganized.amendment.sources.some(s=>s.url.includes('LawHistory.aspx')));
const updatedCompensation=result.essays.find(e=>e.id==='law113-inner-e2');assert(updatedCompensation.model.analysis.includes('單純同車且無犯意聯絡'));assert(updatedCompensation.model.analysis.includes('可歸責事由另可能'));
console.log('Police-law exam explanations, official compensation interpretation and administrative agency reorganization passed.');

// Do not conflate the expired traffic provision, the judgment's transition and the future amendment.
for(const id of ['q38','duty113_04','scene110-17']){
  const q=result.questions.find(item=>item.id===id);assert(q);
  assert.equal(q.amendment.status,'review');assert.equal(q.amendment.effectiveStatus,'mixed');
  assert(q.amendment.note.includes('113.2.25'));assert(q.amendment.note.includes('115.12.31'));
  assert(q.amendment.note.includes('24小時'));assert(q.amendment.note.includes('3日'));assert(q.amendment.note.includes('10日'));
  assert(q.amendment.sources.some(source=>source.url.includes('1150026923_ATTACH2.pdf')));
}
console.log('Expired blood-sampling provision, judgment procedures and future amendment remain distinct.');

// Separate former weapons provisions from the 2022 additions, and each detention-restraint trigger.
const weaponEssay=result.essays.find(e=>e.id==='law111-inner-e1');assert(weaponEssay?.verified);
assert(weaponEssay.amendment.oldRule.includes('第11條')&&weaponEssay.amendment.oldRule.includes('第12條'));
assert(weaponEssay.model.analysis.includes('其他可能致人傷亡的裝備機具'));assert(weaponEssay.model.analysis.includes('考後新增'));
const detentionEssay=result.essays.find(e=>e.id==='law115-inner-e2');assert(detentionEssay?.verified);
assert(detentionEssay.model.analysis.includes('不能把後兩款的「之虞」泛化'));
assert(detentionEssay.model.analysis.includes('危險或危害結束時即終止'));
const compensationEssay=result.essays.find(e=>e.id==='law114-outer-e2');assert(compensationEssay?.verified);
assert(compensationEssay.model.analysis.includes('法院得減免'));assert(compensationEssay.model.analysis.includes('因協議書所生爭議'));
const assemblyEssay=result.essays.find(e=>e.id==='law115-inner-e1');assert(assemblyEssay?.verified);
assert(assemblyEssay.model.analysis.includes('104年1月1日起失效'));assert(assemblyEssay.model.analysis.includes('一般處分分析'));
const identityEssay=result.essays.find(e=>e.id==='law114-inner-e2');assert(identityEssay?.verified);
assert(identityEssay.model.analysis.includes('自攔停起不得逾3小時'));
console.log('Weapons history, detention safeguards, compensation remedies, assembly interpretation and identity checks passed.');

// Distinguish court appeals from objections to police dispositions and retain exam keys.
for(const [id,answer] of [['law114-inner-03',1],['law114-inner-04',0],['law114-inner-05',2],['law114-inner-09',2],['law114-inner-25',1],['law114-outer-03',0],['law114-outer-06',1],['law114-outer-10',3],['law114-outer-11',3],['law114-outer-12',2]]){
  const q=result.questions.find(x=>x.id===id);assert(q?.verified);assert.equal(q.answer,answer);assert.equal(q.options.length,4);
}
const splitPayment=result.questions.find(q=>q.id==='law114-inner-05');assert(splitPayment.currentAnswer.includes('執行之警察機關'));assert(splitPayment.takeaway.includes('2至6期'));
const courtRemedy=result.questions.find(q=>q.id==='law114-outer-10');assert(courtRemedy.currentAnswer.includes('簡易庭裁定'));assert(courtRemedy.options[2].correction.includes('翌日'));
const objectionRecord=result.questions.find(q=>q.id==='law114-outer-03');assert(objectionRecord.options[3].explanation.includes('確認'));
const shooting=result.questions.find(q=>q.id==='law114-inner-03');assert(shooting.currentAnswer.includes('共同生命身體危險前提'));
console.log('Ten police-law explanations preserve official keys and distinguish procedures.');

// Primary campus mechanism is available, but later nationwide flowchart and escort SOP remain pending.
const campus=result.essays.find(e=>e.id==='duty114_s01');assert(campus);assert.equal(campus.verified,false);assert.equal(campus.amendment.status,'review');
assert(campus.model.analysis.includes('主任秘書或學務主任以上'));assert(campus.model.analysis.includes('114年8月21日'));assert(campus.model.analysis.includes('仍待查證'));
for(const id of ['s05','scene115-e2']){const e=result.essays.find(x=>x.id===id);assert(e);assert.equal(e.verified,false);assert(e.model.analysis.includes('監察院114年糾正案'));assert(e.amendment.sources.some(s=>s.url.includes('s=49094')));}
console.log('Campus source and escort privacy case added without clearing unresolved current SOPs.');

// Examine each protection separately: legal basis, urgent-entry threshold and official answer keys.
for(const [id,answer] of [['law115-inner-04',0],['law115-inner-09',1],['law115-inner-13',2],['law115-inner-14',2],['law115-inner-17',0],['law115-inner-22',0],['law115-outer-08',3],['law115-outer-15',3],['law115-outer-19',3],['law115-outer-20',3]]){
 const q=result.questions.find(x=>x.id===id);assert(q?.verified);assert.equal(q.answer,answer);assert.equal(q.options.length,4);
}
assert(result.questions.find(q=>q.id==='law115-inner-04').currentAnswer.includes('不能全說是第16條原文'));
assert(result.questions.find(q=>q.id==='law115-inner-13').currentAnswer.includes('5個月'));
assert(result.questions.find(q=>q.id==='law115-outer-19').takeaway.includes('非進入不能救護'));
assert(result.questions.find(q=>q.id==='law115-outer-15').currentAnswer.includes('個案仍依'));
console.log('Ten safety and police-law explanations preserve answer keys and legal prerequisites.');

// Agency roles, police identity safeguards and relief procedures must stay distinct.
for(const [id,answer] of [['law115-inner-05',1],['law115-inner-18',1],['law115-inner-20',0],['law115-inner-21',3],['law115-outer-03',3],['law115-outer-04',3],['law115-outer-05',2],['law115-outer-06',3],['law115-outer-07',0],['law115-outer-17',1]]){
 const q=result.questions.find(x=>x.id===id);assert(q?.verified);assert.equal(q.answer,answer);assert(q.options.every(o=>o.explanation.trim()&&o.correction.trim()));
}
const identityProtection=result.questions.find(q=>q.id==='law115-inner-20');
assert(identityProtection.currentAnswer.includes('指定的親友或律師'));assert(identityProtection.options[1].explanation.includes('提審法'));
assert(identityProtection.amendment.sources.some(s=>s.url.includes('801310762604691456')));
const executiveHelp=result.questions.find(q=>q.id==='law115-outer-04');
assert(executiveHelp.options[2].explanation.includes('第13條'));assert(executiveHelp.options[3].correction.includes('請求機關'));
const localPolicing=result.questions.find(q=>q.id==='law115-outer-07');
assert(localPolicing.currentAnswer.includes('指揮監督'));assert(localPolicing.currentAnswer.includes('警察機關首長指導'));
const assemblyRelief=result.questions.find(q=>q.id==='law115-inner-21');
assert(assemblyRelief.takeaway.includes('緊急、偶發集會'));assert(assemblyRelief.amendment.sources.some(s=>s.url.includes('id=332415')));
console.log('Police organization, habeas notice, execution assistance and assembly safeguards passed.');

// Habeas relief and religious-place entry have different purposes and legal prerequisites.
for(const [id,answer] of [['investigation110_10',0],['duty110_14',1],['law114-inner-22',0],['law114-outer-22',2],['law114-outer-23',1],['law115-outer-23',1],['law115-outer-02',2],['law115-outer-09',0],['law115-inner-07',0],['law114-outer-02',1]]){
 const q=result.questions.find(x=>x.id===id);assert(q?.verified);assert.equal(q.answer,answer);assert(q.options.every(o=>o.explanation.trim()&&o.correction.trim()));
}
const habeas=result.questions.find(q=>q.id==='investigation110_10');
assert(habeas.currentAnswer.includes('不得僅以無管轄權裁定駁回'));assert(habeas.options[1].explanation.includes('即時'));
const disobedience=result.questions.find(q=>q.id==='law114-inner-22');
assert(disobedience.currentAnswer.includes('違反刑事法律'));assert(disobedience.options[0].explanation.includes('書面署名'));
for(const id of ['duty110_03','duty114_20']){const q=result.questions.find(x=>x.id===id);assert.equal(q?.verified,false);assert.equal(q.amendment.status,'review');assert(q.options.every(o=>o.explanation.trim()&&o.correction.trim()));}
const religiousPlace=result.essays.find(e=>e.id==='duty113_s02');assert.equal(religiousPlace?.verified,false);
assert(religiousPlace.model.analysis.includes('執行後3日內報告該管檢察官及法院'));assert(religiousPlace.model.analysis.includes('不能代替所有個案'));
assert(religiousPlace.amendment.sources.some(s=>s.url.startsWith('https://www-ws.gov.taipei/')));
console.log('Habeas jurisdiction, police safeguards and religious-place search prerequisites passed.');

// Compare legal rules across remedies, personnel benefits and political neutrality.
for(const [id,answer] of [['law113-inner-12',3],['law113-inner-13',2],['law113-inner-16',0],['law113-inner-18',1],['law113-inner-21',2],['law113-inner-23',2],['law113-outer-02',3],['law114-inner-08',1],['law114-outer-19',2],['law114-outer-25',3],['law115-inner-06',1],['law115-inner-24',2],['law115-inner-25',3],['law115-outer-13',3],['law115-outer-25',3]]){
 const q=result.questions.find(x=>x.id===id);assert(q?.verified);assert.equal(q.answer,answer);assert(q.options.every(o=>o.explanation.trim()&&o.correction.trim()));
}
const socialFine=result.questions.find(q=>q.id==='law113-inner-12');
assert(socialFine.currentAnswer.includes('第25條仍留有'));assert(socialFine.currentAnswer.includes('行政執行'));assert(socialFine.amendment.sources.some(s=>s.url.includes('pid=190935')));
const socialAppeal=result.questions.find(q=>q.id==='law113-inner-13');assert(socialAppeal.currentAnswer.includes('不得抗告'));assert(socialAppeal.options[2].correction.includes('不得再抗告'));
const policeBenefits=result.questions.find(q=>q.id==='law115-inner-06');assert(policeBenefits.amendment.sources.some(s=>s.url.includes('pcode=S0020005')));assert(policeBenefits.options[0].explanation.includes('未列半失能'));assert(policeBenefits.options[2].explanation.includes('殉職'));
const neutrality=result.questions.find(q=>q.id==='law115-inner-25');assert(neutrality.options[1].explanation.includes('三親等'));assert(neutrality.options[3].correction.includes('私人'));assert(neutrality.amendment.sources.some(s=>s.url.includes('Page=8326')));
const firearms=result.questions.find(q=>q.id==='law113-inner-23');assert(firearms.options[3].correction.includes('範圍不只槍械'));assert(firearms.options[2].explanation.includes('即時報告'));
console.log('Fifteen statute-backed explanations preserve keys and distinguish remedies, benefits and neutrality safeguards.');

// Handcuff history, specific escort duties and revised checkpoint guidance are not interchangeable.
for(const [id,answer] of [['duty110_05',0],['law110-inner-02',2],['scene114-01',0],['duty115_22',1]]){
 const q=result.questions.find(x=>x.id===id);assert(q?.verified);assert.equal(q.answer,answer);assert(q.options.every(o=>o.explanation.trim()&&o.correction.trim()));
 assert(q.amendment.sources.some(s=>s.url.includes('ws.csptc.gov.tw')));
}
const oldCuffs=result.questions.find(x=>x.id==='duty110_05');assert.equal(oldCuffs.amendment.status,'changed');assert(oldCuffs.amendment.oldRule.includes('5年'));assert(oldCuffs.amendment.newRule.includes('10年'));
const childCuffs=result.questions.find(x=>x.id==='law110-inner-02');assert(childCuffs.currentAnswer.includes('兒童'));assert(childCuffs.amendment.note.includes('不得因兒童'));
const minorEscortCase=result.questions.find(x=>x.id==='duty113_21');assert.equal(minorEscortCase?.verified,false);assert(minorEscortCase.currentAnswer.includes('第3條'));assert(minorEscortCase.amendment.note.includes('仍待查'));
const prepEssay=result.essays.find(x=>x.id==='duty115_s01');assert.equal(prepEssay?.verified,false);assert(prepEssay.model.basis.includes('114年6月27日'));assert(prepEssay.model.analysis.includes('完整原件'));
for(const id of ['s05','scene115-e2']){const e=result.essays.find(x=>x.id===id);assert.equal(e?.verified,false);assert(e.model.analysis.includes('復審案'));assert(e.amendment.sources.some(s=>s.url.includes('ws.exam.gov.tw')));}
const cuffCard=result.laws.find(x=>x.id==='escort-constraints');assert(cuffCard?.points.some(x=>x.includes('10年')));assert(cuffCard.traps.some(x=>x.includes('111年警銬規範')));
console.log('Historical handcuff rules, individual escort duties and revised guidance remain clearly distinguished.');

// Keep police/court remedies, released/stopped detention and verified scope separate.
for(const [id,answer] of [['law112-inner-05',2],['law112-inner-06',3],['law112-inner-07',1],['law112-inner-08',2],['law112-outer-04',3],['law112-outer-05',3],['law112-outer-06',3],['law112-outer-18',0],['law114-inner-02',0],['law114-outer-01',3],['law114-outer-08',0],['law114-inner-20',0],['law114-outer-16',0],['law114-outer-24',1],['law115-outer-14',2]]){
 const q=result.questions.find(x=>x.id===id);assert(q?.verified);assert.equal(q.answer,answer);assert(q.options.every(o=>o.explanation.trim()&&o.correction.trim()));
}
const socialProcedure=result.questions.find(q=>q.id==='law112-inner-06');assert(socialProcedure.currentAnswer.includes('抗告'));assert(socialProcedure.currentAnswer.includes('聲明異議'));
const notExecuted=result.questions.find(q=>q.id==='law112-outer-06');assert(notExecuted.takeaway.includes('確定不等於執行完畢'));
const detentionRelease=result.questions.find(q=>q.id==='law114-inner-02');assert(detentionRelease.currentAnswer.includes('停止管收'));assert(detentionRelease.currentAnswer.includes('釋放'));
const policeCommand=result.questions.find(q=>q.id==='law114-outer-01');assert(policeCommand.options[2].explanation.includes('法律保留'));assert(policeCommand.amendment.sources.some(s=>s.url.includes('id=167483')));
const equalTreatment=result.questions.find(q=>q.id==='law114-outer-16');assert(equalTreatment.currentAnswer.includes('舊法'));assert(equalTreatment.currentAnswer.includes('現行'));
for(const id of ['law115-inner-08','law115-inner-16','law115-outer-21']){const q=result.questions.find(x=>x.id===id);assert.equal(q?.verified,false);assert.equal(q.amendment.status,'review');assert(q.options.every(o=>o.explanation.trim()&&o.correction.trim()));}
assert(result.questions.find(q=>q.id==='law115-inner-16').amendment.note.includes('公眾得出入'));
assert(result.questions.find(q=>q.id==='law115-outer-21').currentAnswer.includes('「等」'));
console.log('Procedure and constitutional explanations preserve exam keys and unresolved statutory scope.');

// Historical administrative cases support learning without silently certifying later rules.
const historicalReport=result.laws.find(x=>x.id==='report');assert.equal(historicalReport?.verified,false);assert(historicalReport.original.includes('111年'));assert(historicalReport.original.includes('不是114年修正版全文'));assert(historicalReport.sources.some(s=>s.url.includes('IN_ID=179121')));
const lateReport=result.questions.find(x=>x.id==='duty112_14');assert.equal(lateReport?.verified,false);assert.equal(lateReport.answer,2);assert(lateReport.currentAnswer.includes('48小時'));assert(lateReport.currentAnswer.includes('72小時'));assert(lateReport.amendment.note.includes('不能逕認目前仍為72小時'));
const assistance=result.questions.find(x=>x.id==='investigation115_01');assert.equal(assistance?.verified,false);assert.equal(assistance.answer,2);assert(assistance.options.every(o=>o.explanation.trim()&&o.correction.trim()));assert(assistance.options[2].correction.includes('一律不得到府'));
const reportingEssay=result.essays.find(x=>x.id==='s10');assert.equal(reportingEssay?.verified,false);assert(reportingEssay.model.analysis.includes('撤銷原懲處'));assert(reportingEssay.model.analysis.includes('不能代替逐級報告'));
console.log('Historical reporting cases remain distinct from current rules and original keys.');
