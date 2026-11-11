import type { Question } from "./study-data";
export const acceptedAnswers=(q:Question)=>q.acceptedAnswers?.length?q.acceptedAnswers:[q.answer];
export const answerLabel=(q:Question)=>q.creditedAll?"一律給分":acceptedAnswers(q).map(n=>String.fromCharCode(65+n)).join("／");
export const isAnswerCorrect=(q:Question,selection:number[])=>q.creditedAll?selection.length===1&&selection[0]>=0&&selection[0]<4:q.acceptedCombinations?.length?q.acceptedCombinations.some(a=>a.length===selection.length&&a.every(i=>selection.includes(i))):selection.length===1&&acceptedAnswers(q).includes(selection[0]);
