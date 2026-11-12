import assert from 'node:assert/strict';
import {register} from 'node:module';
register(`data:text/javascript,${encodeURIComponent(`export async function resolve(s,c,next){try{return await next(s,c)}catch(e){if(e.code==='ERR_MODULE_NOT_FOUND'&&s.startsWith('.')&&!/\\.[a-z]+$/.test(s))return next(s+'.ts',c);throw e}}`)}`,import.meta.url);
const {requestedStudyResets}=await import('../lib/requested-study-resets.ts');
const {validBackupEntry}=await import('../lib/study-records.ts');
const account='shVgVyoeBfKTxDwo3fScSDvq4m9q8AimmjmDT0CgoUI3Uucq4Xndle';
const question='q:investigation115_04',day='day:2026-11-12',stamp=Date.now();
const original={
 [question]:{value:{status:'review',bookmarked:true,wrong:false,attempts:1,correct:1,lastAnswer:2,lastAnswers:[2],lastDate:'2026-11-12',nextReview:'2026-11-15'},updatedAt:1794441308857},
 [day]:{value:{tasks:[],seconds:0,questions:['investigation115_04'],essays:[]},updatedAt:1794441216849},
 'q:duty115_01':{value:{status:'mastered',bookmarked:true,wrong:false,attempts:5,correct:5,note:'保留'},updatedAt:stamp-1},
};
const saved=structuredClone(original),patch=requestedStudyResets(account,original,stamp);
assert.deepEqual(original,saved,'input records are not mutated');
assert.deepEqual(Object.keys(patch).sort(),[day,question].sort());
assert.deepEqual(patch[question].value,{status:'unseen',bookmarked:false,wrong:false,attempts:0,correct:0});
assert.deepEqual(patch[day].value,{tasks:[],seconds:0,questions:[],essays:[]});
for(const [key,value]of Object.entries(patch)){assert(validBackupEntry(key,value));assert(value.updatedAt>original[key].updatedAt);}
assert.deepEqual(requestedStudyResets(account,{...original,...patch},stamp+1),{},'reset is one-shot');
assert.deepEqual(requestedStudyResets('different-account',original,stamp),{},'other accounts are untouched');
const later=structuredClone(original);later[question].updatedAt++;later[day].updatedAt++;later[question].value.attempts=2;later[day].value.questions.push('duty115_01');
assert.deepEqual(requestedStudyResets(account,later,stamp),{},'later real practice is untouched');
const pendingDay={...original,...{[question]:patch[question]}};
assert.deepEqual(Object.keys(requestedStudyResets(account,pendingDay,stamp)),[day],'partial retry completes only the remaining reset');
const otherActivity=structuredClone(original);Object.assign(otherActivity[day].value,{tasks:['core'],seconds:60,essays:['s01'],questions:['investigation115_04','duty115_01']});
const changed=requestedStudyResets(account,otherActivity,stamp)[day];
assert.deepEqual(changed.value,{tasks:['core'],seconds:60,essays:['s01'],questions:['duty115_01']},'other daily activity is preserved');
console.log('Requested test rollback: exact-account/version guards, zero practice, bookmark removal, daily exclusion, idempotence, partial retry and preservation passed.');
