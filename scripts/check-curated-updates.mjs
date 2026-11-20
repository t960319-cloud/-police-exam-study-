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
for(const id of ['q14','q16','duty112_09','duty113_21']){const q=result.questions.find(q=>q.id===id);assert(q);assert.equal(q.verified,false);assert(q.currentAnswer.includes('保留原題'));}
const escortEssay=result.essays.find(e=>e.id==='s05');assert(escortEssay);assert.equal(escortEssay.verified,false);assert(escortEssay.model.basis.includes('110.12.13廢止'));
console.log('Repealed escort regulation stays historical; unresolved exercises retain review status.');
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
const familyCase=result.questions.find(q=>q.id==='scene113-04');assert(familyCase);assert.equal(familyCase.answer,0);assert.equal(familyCase.verified,true);assert(familyCase.currentAnswer.includes('其他重大急迫情事'));assert(familyCase.options[0].correction.includes('不得因A不屬自動緊急就拒絕報案'));
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
const bloodConsent=result.questions.find(q=>q.id==='duty113_04');assert(bloodConsent);assert.equal(bloodConsent.answer,2);assert(bloodConsent.currentAnswer.includes('本人同意'));assert.equal(bloodConsent.verified,false);
const breathNotice=result.questions.find(q=>q.id==='duty114_06');assert(breathNotice);assert.equal(breathNotice.answer,2);assert(breathNotice.options[2].explanation.includes('拒測時應當場告知'));assert.equal(breathNotice.verified,false);
const oldBlood=result.questions.find(q=>q.id==='scene110-17');assert(oldBlood);assert.equal(oldBlood.answer,1);assert.equal(oldBlood.verified,false);assert(oldBlood.currentAnswer.includes('本人同意'));
console.log('Consent, refusal notification, phased enactment and original blood-question answers passed.');
// Historical exam answers do not establish the missing national rules' current full text.
for(const [id,key] of [['investigation115_02',3]]){const q=result.questions.find(q=>q.id===id);assert(q);assert.equal(q.answer,key);assert.equal(q.verified,false);assert.equal(q.amendment.status,'review');assert.notEqual(q.analysisMode,'answer-key');assert(q.currentAnswer.includes('官方'));assert(q.options.every(o=>o.explanation.length>12&&o.correction.length>12));}
console.log('Investigation option explanations retain official keys and unresolved national-rule status.');
// Specific statutes must preserve original keys and distinguish court-approved GPS investigations from short-term notices.
for(const [id,answer] of [['investigation115_05',3],['investigation114_25',3],['investigation115_14',3],['investigation115_24',3]]){
 const q=result.questions.find(q=>q.id===id);assert(q);assert.equal(q.answer,answer);assert.equal(q.verified,true);assert.notEqual(q.analysisMode,'answer-key');assert(q.amendment.sources.length);assert(q.options.every(o=>o.explanation.trim()&&o.correction.trim()&&!o.explanation.includes('本項不在當年度官方接受答案')));
}
const informant=result.questions.find(q=>q.id==='investigation115_05');assert(informant.options[1].explanation.includes('應予保密'));
const youth=result.questions.find(q=>q.id==='investigation114_25');assert(youth.options[3].explanation.includes('例外'));
const domestic=result.questions.find(q=>q.id==='investigation115_14');assert(domestic.currentAnswer.includes('立即通報'));assert(domestic.currentAnswer.includes('24小時'));
const gpsPeriod=result.questions.find(q=>q.id==='investigation115_24');assert(gpsPeriod.currentAnswer.includes('不足24小時以1日計'));assert(gpsPeriod.currentAnswer.includes('期滿2日前'));
// The later fifty-question review resolves the full notice branches in article 153-7.
const gpsNotice=result.questions.find(q=>q.id==='investigation115_25');assert.equal(gpsNotice.answer,1);assert.equal(gpsNotice.verified,true);assert.notEqual(gpsNotice.analysisMode,'answer-key');assert(gpsNotice.options[0].correction.includes('法院許可或補行許可'));assert(gpsNotice.currentAnswer.includes('短期免法院許可'));assert(gpsNotice.amendment.sources.some(s=>s.url.includes('C0010001')));
const passenger=result.questions.find(q=>q.id==='duty112_24');assert.equal(passenger.answer,1);assert.equal(passenger.verified,true);assert(passenger.currentAnswer.includes('駕駛人測得'));assert(passenger.currentAnswer.includes('30日內'));assert(passenger.options[0].explanation.includes('0.25'));
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
const urgentMonitoring=result.questions.find(q=>q.id==='investigation112_09');assert.equal(urgentMonitoring.answer,3);assert.equal(urgentMonitoring.verified,true);assert(urgentMonitoring.currentAnswer.includes('24小時'));assert(urgentMonitoring.currentAnswer.includes('48小時'));assert(urgentMonitoring.options[3].correction.includes('檢察官陳報法院'));
const stalking=result.questions.find(q=>q.id==='investigation114_27');assert.equal(stalking.answer,0);assert.equal(stalking.verified,true);assert(stalking.options[0].explanation.includes('第2項'));assert(stalking.options[0].explanation.includes('性或性別無關'));
console.log('Communication deadlines and records, arrest-warrant copies, and stalking exceptions passed.');
// Reused statutes across historical years must keep exceptions and the original paper keys.
for(const [id,answer] of [['investigation110_15',0],['investigation110_16',1],['investigation110_29',2],['investigation111_28',0],['investigation111_32',1],['investigation111_38',0],['investigation111_39',3],['investigation111_40',2],['investigation111_47',0],['investigation112_35',2],['investigation113_04',1],['investigation113_19',2],['investigation113_21',2]]){
 const q=result.questions.find(q=>q.id===id);assert(q);assert.equal(q.answer,answer);assert(q.verified);assert.notEqual(q.analysisMode,'answer-key');
}
const informantRenewal=result.questions.find(q=>q.id==='investigation112_08');assert.equal(informantRenewal.answer,1);assert.equal(informantRenewal.verified,true);assert(informantRenewal.options[2].explanation.includes('新發生'));
const nightClass=result.questions.find(q=>q.id==='investigation113_21');assert(nightClass.currentAnswer.includes('本身不在'));assert(nightClass.currentAnswer.includes('其他合法例外'));
const protectedLegislator=result.questions.find(q=>q.id==='investigation110_16');assert(protectedLegislator.currentAnswer.includes('現行犯'));assert(protectedLegislator.currentAnswer.includes('通緝'));
console.log('Cross-year legal explanations preserve exceptions, warrant limits and original exam answers.');
// Essay corrections distinguish the assembly law penalty provisions from damages and explain compensation prerequisites.
const penaltyEssay=result.essays.find(e=>e.id==='law113-inner-e1');assert(penaltyEssay);assert(penaltyEssay.verified);assert(penaltyEssay.model.basis.includes('集會遊行法第3、27、28條'));assert(!penaltyEssay.model.basis.includes('集會遊行法第32條'));assert(penaltyEssay.model.analysis.includes('免予移送'));assert(penaltyEssay.model.analysis.includes('結果發生在後'));
const weaponCompensation=result.essays.find(e=>e.id==='law113-inner-e2');assert(weaponCompensation);assert(weaponCompensation.verified);assert(weaponCompensation.model.analysis.includes('排除該次用械相對人'));assert(weaponCompensation.model.analysis.includes('可歸責'));assert(weaponCompensation.model.analysis.includes('三分之一'));assert(weaponCompensation.amendment.note.includes('不是考選部官方'));
console.log('Essay penalty citations, special transfer period and police-weapons compensation safeguards passed.');
// Historical oversight reports and custody notices cannot be silently substituted for current full rules.
const crossEvidence=result.laws.find(l=>l.id==='cross');assert(crossEvidence);assert.equal(crossEvidence.verified,false);assert(crossEvidence.points.some(x=>x.includes('歷史佐證')));assert(crossEvidence.traps.some(x=>x.includes('不能代替完整內規')));
// The complete 115 handbook now supports this question; the broader law card still needs its full rules.
const oldCross=result.questions.find(q=>q.id==='investigation113_03');assert(oldCross);assert.equal(oldCross.answer,2);assert.equal(oldCross.verified,true);assert.notEqual(oldCross.analysisMode,'answer-key');assert(oldCross.currentAnswer.includes('未攜槍得免通報'));assert(oldCross.options[2].explanation.includes('第31點'));assert(oldCross.amendment.sources.some(s=>s.url.startsWith('https://crime.tpa.edu.tw/')));
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
for(const id of ['law115-inner-16']){const q=result.questions.find(x=>x.id===id);assert.equal(q?.verified,false);assert.equal(q.amendment.status,'review');assert(q.options.every(o=>o.explanation.trim()&&o.correction.trim()));}
const temporaryAssist=result.questions.find(q=>q.id==='law115-inner-08');assert(temporaryAssist.verified);assert.equal(temporaryAssist.answer,1);assert(temporaryAssist.currentAnswer.includes('個案性、輔助性、臨時性'));assert(temporaryAssist.amendment.sources.some(s=>s.url.startsWith('https://www.moi.gov.tw/News_toggle3.aspx')));
assert(result.questions.find(q=>q.id==='law115-inner-16').options[0].explanation.includes('公眾得出入'));
const identityAnswers=result.questions.find(q=>q.id==='law115-outer-21');assert(identityAnswers.verified);assert(identityAnswers.currentAnswer.includes('第67條'));assert(identityAnswers.options[1].correction.includes('其他詢問法源另論'));
console.log('Procedure and constitutional explanations preserve exam keys and unresolved statutory scope.');

// Historical administrative cases support learning without silently certifying later rules.
const historicalReportEvent=events.find(e=>e.eventId==='legal-review-20261117-report-cases');
assert(historicalReportEvent?.patches.find(p=>p.targetId==='report')?.lawContent.original.includes('不是114年修正版全文'));
const lateReport=result.questions.find(x=>x.id==='duty112_14');assert.equal(lateReport?.verified,false);assert.equal(lateReport.answer,2);assert(lateReport.currentAnswer.includes('48小時'));assert(lateReport.currentAnswer.includes('72小時'));assert(lateReport.amendment.note.includes('不能逕認目前仍為72小時'));
const assistance=result.questions.find(x=>x.id==='investigation115_01');assert.equal(assistance?.verified,true);assert.equal(assistance.answer,2);assert(assistance.options.every(o=>o.explanation.trim()&&o.correction.trim()));assert(assistance.options[2].correction.includes('一律不得到府'));
const reportingEssay=result.essays.find(x=>x.id==='s10');assert.equal(reportingEssay?.verified,false);assert(reportingEssay.model.analysis.includes('撤銷原懲處'));assert(reportingEssay.model.analysis.includes('不能代替逐級報告'));
console.log('Historical reporting cases remain distinct from current rules and original keys.');

// Full police assembly guidance and official institutional histories back eight explanations.
for(const [id,answer] of [['law112-outer-19',3],['law113-outer-15',1],['law114-inner-24',3],['law113-outer-21',3],['law114-outer-13',0],['law114-outer-21',0],['law115-inner-03',3],['law115-outer-12',1]]){
 const q=result.questions.find(x=>x.id===id);assert(q?.verified);assert.equal(q.answer,answer);assert(q.options.every(o=>o.explanation.trim()&&o.correction.trim()));
}
const assemblyConditions=result.questions.find(q=>q.id==='law114-inner-24');assert(assemblyConditions.currentAnswer.includes('同時具備'));assert(assemblyConditions.options[0].explanation.includes('得'));assert(assemblyConditions.options[1].explanation.includes('即時'));
const publicAssembly=result.questions.find(q=>q.id==='law112-outer-19');assert(publicAssembly.currentAnswer.includes('核准例外'));assert(publicAssembly.amendment.sources.some(s=>s.url.includes('F1002151')));
const reviewBeforeAppeal=result.questions.find(q=>q.id==='law114-outer-13');assert(reviewBeforeAppeal.options[2].explanation.includes('部分協同意見書'));
const trafficOrder=result.questions.find(q=>q.id==='law115-outer-12');assert(trafficOrder.amendment.sources.some(s=>s.title.includes('最高行政法院97年度')));
const agencyHistory=result.questions.find(q=>q.id==='law115-inner-03');assert(agencyHistory.takeaway.includes('戶政81'));assert(agencyHistory.options[3].correction.includes('104年更名'));
console.log('Assembly conditions, legal remedies, traffic orders and agency timelines passed.');

// Preserve corrected grading and avoid treating incomplete official options as conclusive law.
const correctedPowers=result.questions.find(q=>q.id==='law114-inner-23');
assert(correctedPowers?.verified);assert.equal(correctedPowers.answer,0);assert.deepEqual(correctedPowers.acceptedAnswers,[0,1]);
assert(correctedPowers.currentAnswer.includes('A或B均給分'));assert(correctedPowers.amendment.sources.some(s=>s.url.includes('t=M&code=114060')));
const salaryException=result.questions.find(q=>q.id==='law114-inner-21');
assert.equal(salaryException?.verified,true);assert(salaryException.options[1].explanation.includes('最高俸額'));assert(salaryException.options[1].explanation.includes('2個月'));
const dismissalConditions=result.questions.find(q=>q.id==='law113-outer-16');
assert.equal(dismissalConditions?.verified,false);assert(dismissalConditions.options[1].explanation.includes('情節重大'));assert(dismissalConditions.options[3].correction.includes('其他免職事由'));
const executionRelief=result.questions.find(q=>q.id==='law114-outer-09');
assert(executionRelief?.verified);assert(executionRelief.currentAnswer.includes('行政處分性質'));assert(executionRelief.options[1].explanation.includes('10日'));assert(executionRelief.options[1].explanation.includes('30日'));
const thirdParty=result.questions.find(q=>q.id==='law114-inner-01');
assert(thirdParty?.verified);assert(thirdParty.currentAnswer.includes('民事訴訟'));assert(thirdParty.options[3].explanation.includes('施行細則'));
const regulationClass=result.questions.find(q=>q.id==='law112-inner-10');
assert.equal(regulationClass?.verified,false);assert(regulationClass.currentAnswer.includes('仍待補核'));assert.equal(regulationClass.answer,3);assert(regulationClass.options[0].correction.includes('仍待核'));
console.log('Corrected scoring, execution remedies and incomplete personnel or regulation conditions remain distinct.');

// Administrative opinions and criminal elements constrain old answer-key explanations.
const socialFinality=result.questions.find(q=>q.id==='law112-inner-24');
assert.equal(socialFinality?.verified,false);assert.equal(socialFinality.answer,3);assert(socialFinality.options[3].explanation.includes('程序駁回'));assert(socialFinality.options[3].correction.includes('既判力'));assert(socialFinality.amendment.sources.some(s=>s.url.includes('FE336786')));
const businessSanction=result.questions.find(q=>q.id==='law112-inner-22');
assert.equal(businessSanction?.verified,false);assert.equal(businessSanction.answer,0);assert(businessSanction.options[0].explanation.includes('有期徒刑以上'));
const barredGoods=result.questions.find(q=>q.id==='law114-outer-14');
assert.equal(barredGoods?.verified,false);assert(barredGoods.options[3].explanation.includes('單獨沒入'));assert(barredGoods.amendment.sources.some(s=>s.url.includes('FE076579')));
const watchForest=result.questions.find(q=>q.id==='law112-inner-21');
assert.equal(watchForest?.verified,false);assert(watchForest.options[0].explanation.includes('仍留在森林'));assert(watchForest.options[3].explanation.includes('曾列'));
const weaponsPermit=result.questions.find(q=>q.id==='law115-inner-19');
assert(weaponsPermit?.verified);assert.equal(weaponsPermit.answer,2);assert(weaponsPermit.options[3].correction.includes('警械執照'));assert(weaponsPermit.options[3].correction.includes('拋射式'));
const assemblyRadius=result.questions.find(q=>q.id==='law115-inner-11');
assert.equal(assemblyRadius?.verified,false);assert(assemblyRadius.options[3].explanation.includes('實際100公尺邊界'));assert(assemblyRadius.options[0].correction.includes('核准例外'));
console.log('Court finality, forfeiture, forest cases, equipment permits and assembly boundaries remain distinct.');

// Essay corrections must preserve the four shooting conditions and identify their source.
for(const id of ['law112-outer-e1','law112-inner-e1']){
 const e=result.essays.find(x=>x.id===id);assert(e?.verified);assert(e.model.analysis.includes('意圖奪取'));assert(e.model.analysis.includes('其他危害'));assert(e.model.analysis.includes('情況急迫'));assert(e.amendment.note.includes('非官方'));
}
const updatedWeaponEssay=result.essays.find(x=>x.id==='law112-inner-e1');
assert(updatedWeaponEssay.model.analysis.includes('第4條第1項第6款'));assert(updatedWeaponEssay.model.analysis.includes('得依職權或司法警察機關申請'));
const policeOrders=result.essays.find(x=>x.id==='law111-outer-e1');
assert(policeOrders?.verified);assert(policeOrders.model.analysis.includes('中央由內政部'));assert(policeOrders.model.analysis.includes('直轄市政府'));assert(policeOrders.model.analysis.includes('縣（市）政府'));
const doublePunishment=result.essays.find(x=>x.id==='law111-outer-e2');
assert(doublePunishment?.verified);assert(doublePunishment.model.analysis.includes('有罪判決確定'));assert(doublePunishment.model.analysis.includes('無罪確定後'));assert(doublePunishment.model.analysis.includes('不在808本案解釋範圍'));
console.log('Essay shooting conditions, warning scope, police command authorities and constitutional ruling passed.');

// Court-based stop essays distinguish vehicle measures, remedy and involuntary identity checks.
const stopEssay=result.essays.find(e=>e.id==='law114-outer-e1');
assert(stopEssay?.verified);assert(stopEssay.model.analysis.includes('事實行為'));assert(stopEssay.model.analysis.includes('異議紀錄表'));assert(stopEssay.model.analysis.includes('必然須附隨離車'));assert(stopEssay.amendment.sources.some(s=>s.url.includes('1139827')));
const habeasEssay=result.essays.find(e=>e.id==='law112-inner-e2');
assert(habeasEssay?.verified);assert(habeasEssay.model.analysis.includes('自攔停起不得逾3小時'));assert(habeasEssay.model.analysis.includes('提審權'));assert(habeasEssay.model.analysis.includes('顯然無法查證'));
const officerRanks=result.essays.find(e=>e.id==='law113-outer-e2');
assert(officerRanks?.verified);assert(officerRanks.model.analysis.includes('警監有特、一至四階'));assert(officerRanks.model.analysis.includes('同官等低一官階'));
const visitEssay=result.essays.find(e=>e.id==='scene111-e1');
assert(visitEssay?.verified);assert(visitEssay.model.analysis.includes('3日前書面通知'));assert(visitEssay.model.analysis.includes('同意並引導'));assert(visitEssay.model.analysis.includes('個資法'));
console.log('Court-based stop review, habeas safeguards, police ranks and neighborhood visits passed.');

// The full 114 revision replaces the missing-text placeholder without certifying older essays.
const fullReporting=result.laws.find(l=>l.id==='report');assert(fullReporting?.verified);
assert(fullReporting.version.includes('114.01.13'));assert(fullReporting.version.includes('115.05.05列印本'));
assert(fullReporting.points.some(p=>p.includes('5日內陳報')&&p.includes('急迫')));
assert(fullReporting.points.some(p=>p.includes('3日內簽辦')&&p.includes('主官或副主官')&&p.includes('核准後2日內')));
assert(fullReporting.points.some(p=>p.includes('補件')||p.includes('已移轉後收到')));
assert(fullReporting.traps.some(p=>p.includes('不同起算點')||p.includes('不是同一起算點')));
assert(fullReporting.sources.some(s=>new URL(s.url).hostname==='crime.tpa.edu.tw'));
assert(!fullReporting.original.includes('本卡未取得'));
const firstTransfer=result.questions.find(q=>q.id==='investigation114_01');assert(firstTransfer?.verified);assert.equal(firstTransfer.answer,3);
assert(firstTransfer.options[2].explanation.includes('5日內'));assert(firstTransfer.options[3].explanation.includes('2日內'));
assert(assistance.options[2].explanation.includes('衡酌警力及個案事實'));assert(assistance.options[2].explanation.includes('親友代報'));
const fullReportingEssay=result.essays.find(e=>e.id==='s04');assert(fullReportingEssay?.verified);
assert(fullReportingEssay.model.analysis.includes('主官或副主官'));assert(fullReportingEssay.model.analysis.includes('確認接收'));
assert(fullReportingEssay.model.analysis.includes('非官方評分標準'));
const historicalReportingEssay=result.essays.find(e=>e.id==='duty110_s02');assert.equal(historicalReportingEssay?.verified,false);
assert(historicalReportingEssay.model.analysis.includes('110年各款原文仍待核'));
assert(historicalReportingEssay.model.basis.includes('不得把114年時限寫成110年官方答案'));
console.log('Full reporting text separates 5/3/2-day stages, conditional home assistance and historical essay limits.');

// A newly obtained handbook can substantiate individual points without reviving a repealed regulation.
for(const [id,key] of [['q15',2],['scene114-14',1]]){
 const q=result.questions.find(x=>x.id===id);assert(q?.verified);assert.equal(q.answer,key);
 assert(q.amendment.sources.some(s=>new URL(s.url).hostname==='crime.tpa.edu.tw'));
 assert(q.currentAnswer.includes('第222點'));
}
const assistanceDuringEscort=result.questions.find(q=>q.id==='scene114-14');
assert(assistanceDuringEscort.options[1].explanation.includes('不得拒絕'));
assert(assistanceDuringEscort.options[3].explanation.includes('分別前往'));
const handoff=result.questions.find(q=>q.id==='q15');assert(handoff.options[2].explanation.includes('交接清楚'));
assert(!handoff.lawIds.includes('e11'));assert(!assistanceDuringEscort.lawIds.includes('e6'));
assert(!handoff.options[2].explanation.includes('辦法第11條'));
const historicToilet=result.questions.find(q=>q.id==='q16');assert.equal(historicToilet.verified,false);
assert(historicToilet.currentAnswer.includes('不代表舊辦法恢復效力'));
for(const id of ['s05','scene115-e2']){
 const e=result.essays.find(x=>x.id===id);assert.equal(e.verified,false);
 assert(e.model.analysis.includes('不得拒絕'));assert(e.model.analysis.includes('第222點'));
 assert(e.model.basis.includes('110.12.13廢止'));
}
// Do not let permission to request support condition the separate continuous-reporting requirement.
const patrolProcedure=result.questions.find(q=>q.id==='duty113_06');assert.equal(patrolProcedure.answer,3);assert.equal(patrolProcedure.verified,false);
assert(patrolProcedure.options[3].explanation.includes('同時、持續通報'));
assert(patrolProcedure.currentAnswer.includes('另一份巡邏盤查SOP全文'));
assert(chaseLaw.original.includes('完整2頁'));assert(chaseLaw.original.includes('同時通報'));
assert(!chaseLaw.original.includes('未能讀取附件全文'));assert.equal(chaseLaw.verified,false);
assert(chaseLaw.points.some(p=>p.includes('無法或不宜攔停')&&p.includes('終止')));
for(const id of ['s09','duty111_s01']){
 const e=result.essays.find(x=>x.id===id);assert.equal(e.verified,false);
 assert(e.model.analysis.includes('視需要的是勤務支援')||e.model.analysis.includes('視需要請求追查路線勤務支援'));
 assert(e.model.analysis.includes('最新完整SOP與修正沿革仍待核'));
 assert(!e.model.analysis.includes('附件未能讀取'));
}
console.log('Handbook-backed escort answers, non-revival of repealed rules and continuous chase reporting passed.');

// Replace answer-key-only placeholders with the handbook's distinctions and retain exam keys.
for(const [id,key] of [['investigation111_26',1],['investigation111_41',1],['investigation113_02',2],['investigation113_32',3],['investigation113_35',2],['investigation115_34',2]]){
 const q=result.questions.find(x=>x.id===id);assert(q?.verified);assert.equal(q.answer,key);assert.notEqual(q.analysisMode,'answer-key');
 assert(q.options.every(o=>o.explanation.trim()&&!o.explanation.includes('本項不在當年度官方接受答案')));
}
const crimeReport=result.questions.find(q=>q.id==='investigation113_35');assert(crimeReport.options[2].explanation.includes('不需請求處罰'));
const mediation=result.questions.find(q=>q.id==='investigation113_02');assert(mediation.options[2].explanation.includes('得改為應'));assert(mediation.options[3].correction.includes('知悉犯人起6個月'));
const surrender=result.questions.find(q=>q.id==='investigation111_26');assert(surrender.options[1].correction.includes('得而非一律必減'));
const confession=result.questions.find(q=>q.id==='investigation113_32');assert(confession.currentAnswer.includes('自白'));assert(confession.options[2].explanation.includes('未發覺'));
console.log('Reporting, complaint, mediation, surrender and confession explanations preserve all six original keys.');

// Keep case grouping, document format and custody exceptions separate after event replay.
for(const [id,key] of [['investigation110_09',3],['investigation110_41',0],['investigation111_43',2],['investigation113_50',1],['investigation115_13',2],['investigation111_44',0],['investigation113_01',0]]){
 const q=result.questions.find(x=>x.id===id);assert(q?.verified);assert.equal(q.answer,key);assert.notEqual(q.analysisMode,'answer-key');
 assert(q.options.every(o=>!o.explanation.includes('本項不在當年度官方接受答案')));
}
const groupedTransfer=result.questions.find(q=>q.id==='investigation110_09');
assert(groupedTransfer.options[3].explanation.includes('1＋1＋1＋1＝4'));
assert(groupedTransfer.options[3].explanation.includes('純質淨重5公克'));
assert(groupedTransfer.options[3].correction.includes('行政責任'));
assert(groupedTransfer.currentAnswer.includes('僅因丁為軍人'));
assert(groupedTransfer.currentAnswer.includes('正式使用移送書或報告書'));
const exemptEscort=result.questions.find(q=>q.id==='investigation110_41');
assert(exemptEscort.options[0].correction.includes('檢察官許可'));
assert(exemptEscort.options[1].explanation.includes('最重本刑一年以下'));
const referralType=result.questions.find(q=>q.id==='investigation111_43');
assert(referralType.options[2].explanation.includes('第212點第2款'));
assert(referralType.options[2].correction.includes('並非未調查完一概不得函送'));
const paperFormat=result.questions.find(q=>q.id==='investigation113_50');
assert(paperFormat.options[1].correction.includes('移送書'));
assert(paperFormat.options[2].explanation.includes('少年事件用移送書'));
const wantedPaper=result.questions.find(q=>q.id==='investigation115_13');
assert(wantedPaper.options[3].explanation.includes('無另犯他罪'));
assert(wantedPaper.options[3].explanation.includes('通緝或協尋案件移送書'));
const overseasOrder=result.questions.find(q=>q.id==='investigation111_44');
assert(overseasOrder.currentAnswer.includes('現住地、工作地、家屬現住地'));
const overseasTheft=result.questions.find(q=>q.id==='investigation113_01');
assert(overseasTheft.options[3].explanation.includes('不能推回報案'));
assert(overseasTheft.currentAnswer.includes('不能由手冊直接推導可在境外搜捕'));
// A later review supplies point 174 and resolves this previously deferred handling procedure.
assert.equal(result.questions.find(q=>q.id==='investigation111_18').verified,true);
console.log('Transfer grouping, custody permission, special forms and overseas police assignment passed.');

// This acceptance batch must cover 30 distinct questions, while retaining legal boundaries.
const investigationBatch30=events.find(e=>e.eventId==='legal-review-20261119-batch30-investigation');assert(investigationBatch30);
assert.equal(investigationBatch30.patches.length,30);assert.equal(new Set(investigationBatch30.patches.map(p=>p.targetId)).size,30);
for(const patch of investigationBatch30.patches){
 const q=result.questions.find(x=>x.id===patch.targetId);assert(q?.verified);assert.equal(q.amendment.status,'none');assert.notEqual(q.analysisMode,'answer-key');
 assert.equal(patch.optionOverrides.length,4);assert(q.options.every(o=>!o.explanation.includes('本項不在當年度官方接受答案')));
}
const reportResidence=result.questions.find(q=>q.id==='investigation115_04');
assert.equal(reportResidence.answer,0);assert(reportResidence.currentAnswer.includes('允許多個機關各有偵處責任'));
assert(reportResidence.options[1].explanation.includes('亦可能有偵處責任'));assert(reportResidence.options[2].explanation.includes('可有偵處責任'));
const victimResidence=result.questions.find(q=>q.id==='investigation115_36');assert(victimResidence.options[0].correction.includes('被害人是乙'));
const ordinaryCase=result.questions.find(q=>q.id==='investigation111_01');assert(ordinaryCase.options[2].explanation.includes('三份'));assert(ordinaryCase.options[3].explanation.includes('分局長'));
const civilConsent=result.questions.find(q=>q.id==='investigation112_26');assert(civilConsent.options[1].explanation.includes('指揮官不能'));assert(civilConsent.options[1].explanation.includes('搜索、扣押'));
const waitForCounsel=result.questions.find(q=>q.id==='investigation112_17');assert(waitForCounsel.options[1].explanation.includes('四小時'));assert(waitForCounsel.options[1].explanation.includes('等候通譯'));
const statementEvidence=result.questions.find(q=>q.id==='investigation113_42');assert(statementEvidence.options[2].explanation.includes('不符的部分不得作為證據'));assert(statementEvidence.options[2].correction.includes('不是整份筆錄一律排除'));
const counselForm=result.questions.find(q=>q.id==='investigation114_14');assert(counselForm.options[3].explanation.includes('不以司法狀紙為限'));assert(counselForm.options[2].explanation.includes('第95條'));
const supportAndCounsel=result.questions.find(q=>q.id==='investigation115_47');assert(supportAndCounsel.options[2].explanation.includes('必要時'));assert(supportAndCounsel.options[3].correction.includes('不同保障'));
const embassyConsent=result.questions.find(q=>q.id==='investigation111_23');assert(embassyConsent.options[1].explanation.includes('同意進入不等於同意所有後續行為'));
for(const id of ['investigation111_17','investigation115_30'])assert(result.questions.find(q=>q.id===id).currentAnswer.includes('十二小時'));
const interceptionAuthority=result.questions.find(q=>q.id==='investigation115_44');assert(interceptionAuthority.currentAnswer.includes('司法聲請、核發及執行管制仍須完成'));
for(const id of ['investigation112_21','investigation114_07'])assert.equal(result.questions.find(q=>q.id===id).verified,false);
const reportAttachments=result.questions.find(q=>q.id==='investigation111_04');assert(reportAttachments.verified);assert.equal(reportAttachments.amendment.status,'changed');assert(reportAttachments.options[0].explanation.includes('自願受搜索同意書'));
const recordConfirmation=result.questions.find(q=>q.id==='investigation111_14');assert(recordConfirmation.verified);assert(recordConfirmation.options[2].correction.includes('先使受詢問人明瞭'));
console.log('Thirty-question acceptance, concurrent police responsibility, inquiry rights and distinct judicial authorization passed.');

const procedureBatch30=events.find(e=>e.eventId==='legal-review-20261119-procedure30');assert(procedureBatch30);
assert.equal(procedureBatch30.patches.length,30);assert.equal(new Set(procedureBatch30.patches.map(p=>p.targetId)).size,30);
for(const p of procedureBatch30.patches){
 const q=result.questions.find(x=>x.id===p.targetId);assert(q?.verified);assert.equal(q.amendment.status,'none');assert.notEqual(q.analysisMode,'answer-key');
 assert.equal(p.optionOverrides.length,4);assert(q.options.every(o=>!o.explanation.includes('本項不在當年度官方接受答案')));
}
const urgentArrest=result.questions.find(q=>q.id==='investigation110_17');assert(urgentArrest.options[3].explanation.includes('逃亡之虞'));assert(urgentArrest.currentAnswer.includes('不及報告檢察官'));
const sampleLimits=result.questions.find(q=>q.id==='investigation110_20');assert(sampleLimits.options[2].explanation.includes('檢察官許可及急迫追認'));assert(sampleLimits.currentAnswer.includes('24小時'));
const noticeKinds=result.questions.find(q=>q.id==='investigation110_48');assert(noticeKinds.options[1].explanation.includes('郵務送達'));assert(noticeKinds.options[2].correction.includes('他造當事人'));
const seizureOr=result.questions.find(q=>q.id==='investigation111_19');assert(seizureOr.options[0].explanation.includes('擇一'));assert(seizureOr.options[3].explanation.includes('檢察官及法院'));
const witnessDeadline=result.questions.find(q=>q.id==='investigation112_16');assert(witnessDeadline.options[2].explanation.includes('七日'));assert(witnessDeadline.options[0].correction.includes('不是所有普通證人'));
const lawyerVisit=result.questions.find(q=>q.id==='investigation113_18');assert.equal(lawyerVisit.answer,0);assert(lawyerVisit.options[0].explanation.includes('第34條第2項'));assert(lawyerVisit.options[0].explanation.includes('一小時'));assert(lawyerVisit.options[0].correction.includes('第1項法院羈押'));
const legislatorArrest=result.questions.find(q=>q.id==='investigation113_44');assert(legislatorArrest.options[1].explanation.includes('憲法增修條文第4條'));assert(legislatorArrest.options[1].explanation.includes('會期中'));assert(legislatorArrest.options[1].explanation.includes('現行犯'));
const returnedProperty=result.questions.find(q=>q.id==='investigation111_18');assert.equal(returnedProperty.answer,0);assert(returnedProperty.options[1].explanation.includes('第140條本就允許'));assert(returnedProperty.options[1].correction.includes('方式本身不是違法'));assert(returnedProperty.options[2].explanation.includes('承辦檢察官'));
const recordRights=result.questions.find(q=>q.id==='investigation112_18');assert(recordRights.currentAnswer.includes('法律另外賦予'));assert(recordRights.options[2].correction.includes('羈押審查'));
const evidenceChain=result.questions.find(q=>q.id==='investigation115_49');assert(evidenceChain.options[2].explanation.includes('編號'));assert(evidenceChain.options[3].explanation.includes('禁止向被告或第三人清償'));
console.log('Next 30 procedure questions preserve legal authority, witness safeguards, limited visit scope and lawful property handling.');

// Fifty questions replay as two valid events without weakening the 40-patch limit.
const batch50Events=['a','b'].map(s=>events.find(e=>e.eventId==='legal-review-20261119-batch50-'+s));
assert(batch50Events.every(Boolean));
assert.deepEqual(batch50Events.map(e=>e.patches.length),[25,25]);
const batch50Patches=batch50Events.flatMap(e=>e.patches);
assert.equal(new Set(batch50Patches.map(p=>p.targetId)).size,50);
assert.equal(batch50Patches.reduce((n,p)=>n+p.optionOverrides.length,0),200);
assert.equal(validateLegalEvent({...batch50Events[0],patches:batch50Patches},ids),false);
for(const p of batch50Patches){
 const q=result.questions.find(x=>x.id===p.targetId);
 assert(q?.verified);assert.equal(q.amendment.status,'none');assert.notEqual(q.analysisMode,'answer-key');
 assert(q.options.every(o=>o.explanation.trim()&&!o.explanation.includes('本項不在當年度官方接受答案')));
}
const fiftyQ=id=>result.questions.find(q=>q.id===id);
// Disclosing a capture remains subject to deidentification; a media request is no legal ground.
assert(fiftyQ('investigation113_38').options[1].correction.includes('去識別化'));
assert(fiftyQ('investigation113_39').options[2].explanation.includes('不是第8條'));
assert(fiftyQ('investigation110_37').options[1].explanation.includes('法定保密義務人'));
// The current statute takes priority over the handbook's older direct-referral wording.
for(const id of ['investigation111_45','investigation113_49']){
 assert(fiftyQ(id).currentAnswer.includes('少輔會先行輔導'));
 assert(fiftyQ(id).amendment.sources.some(s=>s.url.includes('C0010011')));
}
assert(fiftyQ('investigation115_22').currentAnswer.includes('第18條之6'));
assert(fiftyQ('investigation115_22').options[2].correction.includes('法官未許可應即護送'));
// A listed crime family differs from a particular crime qualifying through the ten-year threshold.
const callRecords=fiftyQ('investigation111_13');
assert(callRecords.options[1].correction.includes('最輕本刑10年以上'));
assert(callRecords.currentAnswer.includes('貪污未被整部列入'));
assert(fiftyQ('investigation112_09').currentAnswer.includes('檢察官'));
assert(fiftyQ('investigation112_09').currentAnswer.includes('48小時'));
const batch50GpsNotice=fiftyQ('investigation115_25');
assert(batch50GpsNotice.currentAnswer.includes('短期免法院許可'));
assert(batch50GpsNotice.options[1].explanation.includes('14日'));
// Location, minimum rank and a co-suspect's status must each be assessed on their own.
assert(fiftyQ('investigation115_16').options[3].explanation.includes('不會把板橋查獲改成中壢查獲'));
assert(fiftyQ('investigation113_08').currentAnswer.includes('包含符合條件的較高職務'));
assert(fiftyQ('investigation113_10').currentAnswer.includes('主辦或協調'));
assert(fiftyQ('investigation114_41').options[1].correction.includes('第88條之1'));
// Do not turn a category comparison into a blanket prohibition or revive the old mandatory reduction.
assert(fiftyQ('investigation114_30').options[1].correction.includes('不是車站永不得'));
assert(fiftyQ('investigation111_09').options[0].correction.includes('其信賴之人'));
assert(fiftyQ('investigation112_49').options[2].explanation.includes('法院宣告'));
assert(fiftyQ('investigation114_04').options[2].explanation.includes('無確切根據'));
assert(fiftyQ('investigation114_04').currentAnswer.includes('得減刑'));
assert(fiftyQ('investigation114_04').currentAnswer.includes('一般裁判參考'));
for(const id of ['investigation110_42','investigation112_04','investigation112_12','investigation112_25','investigation112_37','investigation113_33','investigation113_43','investigation114_36']){
 assert.equal(fiftyQ(id).verified,false);
 assert(!batch50Patches.some(p=>p.targetId===id));
}
console.log('Fifty-question replay, unchanged event limit, juvenile priority, disclosure limits and independent legal thresholds passed.');

// A hundred supplements are distinct from the subset cleared for current study.
{
 const hundredEvents=['a','b','c','d'].map(s=>events.find(e=>e.eventId==='legal-review-20261120-batch100-'+s));
 assert(hundredEvents.every(Boolean));assert.deepEqual(hundredEvents.map(e=>e.patches.length),[25,25,25,25]);
 const hundredPatches=hundredEvents.flatMap(e=>e.patches);
 assert.equal(new Set(hundredPatches.map(p=>p.targetId)).size,100);
 assert.equal(hundredPatches.reduce((n,p)=>n+p.optionOverrides.length,0),400);
 assert.equal(hundredPatches.filter(p=>p.verified).length,75);
 assert.equal(hundredPatches.filter(p=>!p.verified).length,25);
 assert(validateLegalEvent({...hundredEvents[0],patches:hundredPatches.slice(0,40)},ids));
 assert.equal(validateLegalEvent({...hundredEvents[0],patches:hundredPatches.slice(0,41)},ids),false);
 const q=id=>result.questions.find(x=>x.id===id);
 for(const p of hundredPatches){
  const target=q(p.targetId);assert(target);assert.equal(target.verified,p.verified);
  assert.notEqual(target.analysisMode,'answer-key');
  assert(target.options.every(o=>o.explanation.trim()&&o.correction.trim()));
 }
 // Invalid original single-choice wording does not erase the official all-credit decision.
 for(const id of ['law113-outer-12','law114-inner-10']){
  assert(q(id).creditedAll);assert.equal(q(id).verified,false);
  assert(q(id).currentAnswer.includes('一律給分'));
 }
 assert(q('law113-outer-12').options[0].correction.includes('第266條第2項'));
 assert(q('law114-inner-10').options[2].correction.includes('第237條之3'));
 assert(q('law114-inner-10').options[3].correction.includes('300元'));
 assert.deepEqual(q('law114-inner-14').acceptedAnswers,[0,1]);
 assert.deepEqual(q('law114-inner-15').acceptedAnswers,[1,3]);
 // Record duties, disclosures and collection powers have separate legal grounds.
 assert(q('duty114_08').options.some(o=>o.explanation.includes('定時定點')));
 assert(q('law115-outer-21').options[1].correction.includes('其他詢問法源'));
 assert(q('investigation115_28').options[2].correction.includes('不可因此推論'));
 assert(q('investigation114_11').options[3].correction.includes('並非可任意調閱'));
 // A later edition or announced amendment must not silently rewrite the original exam.
 assert.equal(q('scene113-12').answer,3);assert.equal(q('scene113-12').amendment.status,'changed');
 assert(q('scene113-12').options[3].correction.includes('不把列印當唯一合法方式'));
 assert.equal(q('law114-inner-16').verified,false);
 assert.equal(q('law114-inner-16').amendment.effectiveStatus,'mixed');
 assert.equal(q('law114-inner-16').amendment.effectiveDate,'2026-12-31');
 assert(q('duty113_04').amendment.note.includes('115.12.31'));
 assert.equal(q('scene115-13').verified,false);assert(q('scene115-13').options[0].correction.includes('不能只依甲一句話'));
 assert.equal(q('scene115-14').verified,false);assert(q('scene115-14').options[1].correction.includes('不得把對空鳴槍當'));
 assert(q('investigation115_23').options[2].correction.includes('3日前可屬提前提出'));
 assert(q('investigation115_26').options[2].explanation.includes('7月12日0時'));
}
console.log('Hundred-question supplements, official final credit, exact event limit, future commencement and retained review passed.');

// The additional fifty are separate from the previous hundred, with explicit source gaps.
{
 const extraEvents=['a','b'].map(s=>events.find(e=>e.eventId==='legal-review-20261120-plus50-'+s));
 assert(extraEvents.every(Boolean));assert.deepEqual(extraEvents.map(e=>e.patches.length),[25,25]);
 const extraPatches=extraEvents.flatMap(e=>e.patches),extraIds=new Set(extraPatches.map(p=>p.targetId));
 const previousHundred=new Set(events.filter(e=>e.eventId.startsWith('legal-review-20261120-batch100-')).flatMap(e=>e.patches.map(p=>p.targetId)));
 assert.equal(extraIds.size,50);assert([...extraIds].every(id=>!previousHundred.has(id)));
 assert.equal(extraPatches.reduce((n,p)=>n+p.optionOverrides.length,0),200);
 assert.equal(extraPatches.filter(p=>p.verified).length,13);assert.equal(extraPatches.filter(p=>!p.verified).length,37);
 const q=id=>result.questions.find(x=>x.id===id);
 for(const p of extraPatches){assert.equal(q(p.targetId).verified,p.verified);assert.notEqual(q(p.targetId).analysisMode,'answer-key');}
 // A sample label and a sampling notice have different statutory fields.
 assert(q('investigation112_41').options[0].explanation.includes('通知書須記載住所或居所'));
 assert(q('investigation110_04').options[2].explanation.includes('檢察官核發拘票'));
 assert(q('investigation112_36').takeaway.includes('既有／新'));
 assert.equal(q('investigation112_38').amendment.status,'changed');
 assert(q('investigation112_38').options[2].correction.includes('依法指定範圍'));
 // A demand letter is not an enforcement title; voluntary enforcement requires approval.
 const tuition=q('law114-outer-07');assert(tuition.verified);assert.equal(tuition.answer,1);
 assert(tuition.options[2].explanation.includes('觀念通知'));assert(tuition.options[3].explanation.includes('認可'));
 assert(tuition.amendment.sources.some(s=>s.url.includes('FE307665')));
 assert.equal(q('law113-inner-20').verified,false);assert(q('law113-inner-20').options[1].explanation.includes('第6條'));
 const offenderRecords=q('investigation111_48');assert(offenderRecords.verified);assert.equal(offenderRecords.answer,3);
 assert(offenderRecords.options[0].explanation.includes('舊法第9條'));assert(offenderRecords.currentAnswer.includes('第29條'));
 assert(offenderRecords.amendment.sources.some(s=>s.url.includes('lnndate=20151223')));
 // Final all-credit scoring does not make every overtime statement legally correct.
 assert(q('duty113_01').creditedAll);assert(q('duty113_01').currentAnswer.includes('一律給分'));
 assert(q('duty113_01').options[0].correction.includes('50改40'));
 assert(q('duty113_01').options[1].correction.includes('100應改80'));
 assert.equal(q('duty113_10').answer,2);assert(q('duty113_10').currentAnswer.includes('並非D'));
 assert(q('duty115_01').verified);assert(q('duty115_01').currentAnswer.includes('16小時以上'));
 assert.equal(q('duty114_22').verified,false);assert(q('duty114_22').options[3].correction.includes('比例與平等皆要遵守'));
 assert.equal(q('investigation115_27').verified,false);assert(q('investigation115_27').currentAnswer.includes('附件十三'));
 assert(q('investigation115_27').options[3].correction.includes('不得不正取供'));
 // Taipei's official law host is accepted without accepting lookalike domains.
 const taipei={title:'臺北市法規查詢系統',url:'https://laws.gov.taipei/Law/LawSearch/LawArticleContent/FL004759'};
 assert(validateLegalEvent({...extraEvents[0],sources:[taipei]},ids));
 assert.equal(validateLegalEvent({...extraEvents[0],sources:[{...taipei,url:'https://laws.gov.taipei.example.com/law'}]},ids),false);
}
console.log('Additional fifty, distinct targets, statutory document fields, contract enforcement, version changes and retained source gaps passed.');
