import assert from 'node:assert/strict';
import test from 'node:test';
import { rankStudyTopics, selectDailyQuestions, needsLegalReview, DEFAULT_QUESTION_PROGRESS } from '../lib/study-priorities.ts';
const today='2026-11-12';
const topic=id=>({id,name:id,short:id,color:'indigo'});
const question=(id,topicId=id,extra={})=>({id,topic:topicId,verified:true,...extra});
const entry=value=>({value,updatedAt:1});
const progress=(id,extra={})=>({[`q:${id}`]:entry({...DEFAULT_QUESTION_PROGRESS,...extra})});

test('a weak topic outside the original eight enters the first position without changing records',()=>{
 const topics=Array.from({length:12},(_,i)=>topic(String(i)));
 const qs=topics.map(t=>question(t.id));
 const records=progress('11',{attempts:10,correct:2,wrong:true,status:'review',lastDate:'2026-10-01',nextReview:'2026-11-01'});
 const before=structuredClone(records);
 const ranked=rankStudyTopics(topics,qs,[],records,today);
 assert.equal(ranked[0].topic.id,'11');assert.equal(ranked[0].errorRate,.8);
 assert.match(ranked[0].reason,/到期/);assert.deepEqual(records,before);
});

test('recency and law mastery change otherwise equal topic priorities',()=>{
 const topics=[topic('fresh'),topic('old')];const qs=topics.map(t=>question(t.id));
 const records={...progress('fresh',{attempts:10,correct:10,lastDate:today}),...progress('old',{attempts:10,correct:10,lastDate:'2026-10-01'})};
 assert.equal(rankStudyTopics(topics,qs,[],records,today)[0].topic.id,'old');
 const equal={...progress('fresh',{lastDate:today}),...progress('old',{lastDate:today}),'law:a':entry('mastered')};
 const laws=[{id:'a',topic:'fresh'},{id:'b',topic:'old'}];
 assert.equal(rankStudyTopics(topics,qs,laws,equal,today)[0].topic.id,'old');
 assert.equal(rankStudyTopics(topics,qs,laws,{...equal,'law:a':entry('review'),'law:b':entry('mastered')},today)[0].topic.id,'fresh');
});

test('mastering former wrong answers lowers their priority but retains their error history',()=>{
 const topics=[topic('recovered'),topic('new')];const qs=topics.map(t=>question(t.id));
 const records=progress('recovered',{attempts:5,correct:0,wrong:true,lastDate:today,status:'mastered',nextReview:'2026-11-19'});
 const ranked=rankStudyTopics(topics,qs,[],records,today);
 assert.equal(ranked[0].topic.id,'new');assert.equal(ranked[1].errorRate,1);
 assert.equal(records['q:recovered'].value.wrong,true);
});

test('due review precedes future review and automatic practice excludes legal or personal doubts',()=>{
 const qs=[question('future'),question('due'),question('original',undefined,{verified:false}),question('legal',undefined,{amendment:{status:'review'}}),question('effective',undefined,{amendment:{status:'changed',effectiveStatus:'unverified'}}),question('personal')];
 const records={...progress('future',{attempts:2,correct:0,wrong:true,status:'review',lastDate:today,nextReview:'2026-11-15'}),...progress('due',{attempts:2,correct:0,wrong:true,status:'review',lastDate:'2026-11-01',nextReview:today}),...progress('personal',{status:'verify'})};
 assert.deepEqual(selectDailyQuestions(qs,records,[],today).map(q=>q.id),['due','future']);
 assert.equal(needsLegalReview(qs[2]),true);assert.equal(needsLegalReview(qs[4]),true);
});

test('review-only selection stays review-only and sessions contain at most eight distinct questions',()=>{
 const qs=Array.from({length:20},(_,i)=>question(String(i)));
 const records={...progress('5',{status:'review'}),...progress('7',{wrong:true,status:'mastered'}),...progress('9',{wrong:true})};
 assert.deepEqual(new Set(selectDailyQuestions(qs,records,[],today,true).map(q=>q.id)),new Set(['5','9']));
 const ids=selectDailyQuestions(qs,records,[],today).map(q=>q.id);
 assert.equal(ids.length,8);assert.equal(new Set(ids).size,8);
});

test('new accounts and future dates produce finite, stable priorities without writes',()=>{
 const topics=[topic('one'),topic('two')];const qs=topics.map(t=>question(t.id));
 assert.deepEqual(rankStudyTopics(topics,qs,[],{},today).map(t=>t.topic.id),['one','two']);
 const ranked=rankStudyTopics(topics,qs,[],progress('one',{lastDate:'2099-01-01'}),today);
 assert(ranked.every(t=>Number.isFinite(t.score)));assert.equal(ranked[0].topic.id,'two');
});
