import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const project=fileURLToPath(new URL('../',import.meta.url));
const {chromium}=await import(process.env.STUDY_BROWSER_MODULE||'playwright-core');
await mkdir(path.join(project,'.sites-runtime'),{recursive:true});
const temp=await mkdtemp(path.join(project,'.sites-runtime/browser-check-'));
const state=path.join(temp,'state');
const environment={...process.env,STUDY_TEST_STATE:state,SITES_RUNTIME_ROOT:path.join(temp,'runtime')};
const config=path.join(temp,'d1.json');
await writeFile(config,JSON.stringify({name:'police-study-browser-test',compatibility_date:'2026-05-15',d1_databases:[{binding:'DB',database_name:'site-creator-d1',database_id:'00000000-0000-4000-8000-000000000000',migrations_dir:path.join(project,'drizzle')}]}));
const migration=spawnSync(process.execPath,['--import','./scripts/sites-env.mjs','./node_modules/wrangler/bin/wrangler.js','d1','migrations','apply','DB','--local','--config',config,'--persist-to',state],{cwd:project,env:environment,encoding:'utf8'});
if(migration.status!==0)throw Error(migration.stdout+migration.stderr);
async function port(){const server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));const number=server.address().port;await new Promise(r=>server.close(r));return number;}
const number=await port();const root=`http://127.0.0.1:${number}`;
const log=createWriteStream(path.join(temp,'server.log'));
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port',String(number),'--strictPort'],{cwd:project,env:environment,detached:true,stdio:['ignore','pipe','pipe']});server.stdout.pipe(log);server.stderr.pipe(log);
async function ready(url,child){for(let i=0;i<120;i++){if(child.exitCode!==null)throw Error(`Server exited ${child.exitCode}`);try{const r=await fetch(url);if(r.ok)return;}catch{}await new Promise(r=>setTimeout(r,250));}throw Error('Server readiness timed out');}
let browser;let production;let succeeded=false;
try{
 await ready(root+'/api/session',server);
 browser=await chromium.launch({...(process.env.STUDY_CHROMIUM_PATH?{executablePath:process.env.STUDY_CHROMIUM_PATH}:{}),headless:true,args:['--no-sandbox']});
 const context=await browser.newContext({viewport:{width:1280,height:900},acceptDownloads:true});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const queueEmpty=(page)=>page.waitForFunction(()=>{
  const queue=JSON.parse(localStorage.getItem('police-study-pending-v2:user:local-preview')||'{}');
  return Object.keys(queue).length===0&&document.querySelector('.sync-status')?.textContent==='已同步';
 },{},{timeout:20000});
 const headers={'X-Study-User':'local-preview'};
 const records=async()=>{const r=await context.request.get(root+'/api/records',{headers});assert.equal(r.status(),200);return(await r.json()).records;};
 const navigate=async name=>page.locator('nav[aria-label="主要導覽"]').getByRole('button',{name,exact:true}).click();
 await page.goto(root,{waitUntil:'networkidle'});await queueEmpty(page);
 await page.getByRole('button',{name:'全部題庫',exact:true}).click();await page.locator('.question-row-main').first().click();
 let dialog=page.getByRole('dialog');await dialog.getByRole('button',{name:'收藏這題',exact:true}).click();await dialog.locator('.answer-option').nth(0).click();await dialog.getByRole('button',{name:'確認答案',exact:true}).click();await dialog.getByLabel('我的錯因筆記').fill('三小時自攔停起算');await dialog.getByRole('button',{name:'已掌握',exact:true}).click();await dialog.getByRole('button',{name:'關閉視窗'}).click();await queueEmpty(page);
 let db=await records();const qKey=Object.keys(db).find(k=>k.startsWith('q:'));assert.equal(db[qKey].value.bookmarked,true);assert.equal(db[qKey].value.attempts,1);assert.equal(db[qKey].value.status,'mastered');
 await page.reload({waitUntil:'networkidle'});await queueEmpty(page);await page.locator('.question-row-main').first().click();assert.equal(await page.getByLabel('我的錯因筆記').inputValue(),'三小時自攔停起算');await page.getByRole('button',{name:'關閉視窗'}).click();console.log('PASS answer, bookmark, note, mastery, day log and reload');
 await navigate('法條速記');await page.locator('.law-card-title').first().click();await page.getByRole('dialog').getByRole('button',{name:'已掌握',exact:true}).click();await page.getByRole('button',{name:'關閉視窗'}).click();await queueEmpty(page);db=await records();assert(Object.entries(db).some(([k,r])=>k.startsWith('law:')&&r.value==='mastered'));
 await page.locator('.law-card-title').filter({hasText:'刑訴法第205-4條'}).click();assert((await page.getByRole('dialog').innerText()).includes('不得抗告'));assert((await page.getByRole('dialog').innerText()).includes('十日'));await page.getByRole('button',{name:'關閉視窗'}).click();
 await page.locator('.law-card-title').filter({hasText:'解送人犯辦法第6條'}).click();assert((await page.getByRole('dialog').innerText()).includes('已廢止'));assert((await page.getByRole('dialog').innerText()).includes('110.12.13'));await page.getByRole('button',{name:'關閉視窗'}).click();
 const legalEvents=await(await context.request.get(root+'/api/legal-updates')).json();assert(legalEvents.events.some(e=>e.eventId.endsWith('-escort-repeal')));console.log('PASS sampling remedy, repealed-law notice and appended legal history');
 await navigate('申論練習');await page.locator('.essay-fields textarea').nth(0).fill('共同原稿');await page.locator('.essay-fields textarea').nth(3).fill('措施與比例原則');await page.locator('.self-check input').first().check();await queueEmpty(page);db=await records();const essayKey=Object.keys(db).find(k=>k.startsWith('essay:'));
 await page.getByLabel('申論年度',{exact:true}).selectOption('114');await page.locator('.essay-fields textarea').nth(0).fill('114年獨立草稿');await queueEmpty(page);db=await records();const filteredKey=Object.keys(db).find(k=>k.startsWith('essay:')&&db[k].value.intro==='114年獨立草稿');assert(filteredKey!==essayKey);assert.equal(db[essayKey].value.intro,'共同原稿');
 await page.route('**/api/records',route=>route.abort('internetdisconnected'));await page.locator('.essay-fields textarea').nth(3).fill('離線分析仍保留');await page.waitForTimeout(700);await page.reload({waitUntil:'networkidle'});await page.getByLabel('申論年度',{exact:true}).selectOption('114');assert.equal(await page.locator('.essay-fields textarea').nth(3).inputValue(),'離線分析仍保留');await page.unroute('**/api/records');await page.evaluate(()=>window.dispatchEvent(new Event('online')));await queueEmpty(page);assert.equal((await records())[filteredKey].value.analysis,'離線分析仍保留');console.log('PASS law and essay persistence, filtered draft isolation, offline reload and retry');
 // Two independent browsers, one account, concurrent edits.
 await page.getByLabel('申論年度',{exact:true}).selectOption('all');
 const second=await browser.newContext();const other=await second.newPage();other.on('pageerror',e=>errors.push(e.message));await other.goto(root+'/#essays',{waitUntil:'networkidle'});await queueEmpty(other);assert.equal(await other.locator('.essay-fields textarea').nth(0).inputValue(),'共同原稿');
 await other.route('**/api/records',route=>route.abort('internetdisconnected'));await other.locator('.essay-fields textarea').nth(0).fill('裝置B草稿');await page.locator('.essay-fields textarea').nth(0).fill('裝置A草稿');await queueEmpty(page);
 await other.unroute('**/api/records');await other.evaluate(()=>window.dispatchEvent(new Event('online')));await other.locator('.sync-status').filter({hasText:'待處理衝突'}).waitFor();await other.locator('.sync-status').click();const conflict=other.locator('.sync-conflict');await conflict.waitFor();assert((await conflict.innerText()).includes('裝置A草稿'));assert((await conflict.innerText()).includes('裝置B草稿'));await conflict.getByRole('button',{name:'保留我的版本'}).click();await queueEmpty(other);assert.equal((await records())[essayKey].value.intro,'裝置B草稿');
 await other.getByLabel('選擇還原紀錄').selectOption(essayKey);await other.getByRole('button',{name:'查看可還原版本'}).click();const prior=other.locator('.study-protection details').filter({hasText:'裝置A草稿'}).first();await prior.waitFor();await prior.locator('summary').click();await prior.getByRole('button',{name:'還原這個版本'}).click();await queueEmpty(other);assert.equal((await records())[essayKey].value.intro,'裝置A草稿');console.log('PASS actual D1 conflict choice and prior-version restore');
 await other.getByRole('button',{name:'關閉視窗'}).click();await second.close();
 await page.reload({waitUntil:'networkidle'});await queueEmpty(page);await page.getByRole('button',{name:'設定與備份',exact:false}).first().click();const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'匯出完整備份 JSON'}).click();const download=await downloadPromise;const chunks=[];for await(const chunk of await download.createReadStream())chunks.push(chunk);const backup=JSON.parse(Buffer.concat(chunks).toString());assert(backup.records[qKey]);backup.records[filteredKey]={value:{intro:'備份合併成功'},updatedAt:Date.now()+1000};await page.locator('input[type=file]').setInputFiles({name:'backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(backup))});await page.getByText('已合併1筆較新的讀書紀錄。',{exact:true}).waitFor();await queueEmpty(page);assert.equal((await records())[filteredKey].value.intro,'備份合併成功');await page.getByRole('button',{name:'關閉視窗'}).click();console.log('PASS backup export/import');
 // Real local auth cookie is a different account; forged trusted headers are stripped by the dev middleware.
 const accountB=await browser.newContext();const signedIn=await accountB.newPage();await signedIn.goto(root+'/signin-with-chatgpt?return_to=%2F',{waitUntil:'networkidle'});const session=await(await accountB.request.get(root+'/api/session')).json();assert.equal(session.user.userId,'local_seedy');
 const bRecords=await accountB.request.get(root+'/api/records',{headers:{'X-Study-User':'local_seedy'}});assert.deepEqual((await bRecords.json()).records,{});
 assert.equal((await accountB.request.put(root+'/api/records',{headers, data:{key:'essay:cross',value:{intro:'forbidden'},updatedAt:Date.now(),baseUpdatedAt:null}})).status(),409);
 const bHistory=await accountB.request.get(root+`/api/records?history=${essayKey}`,{headers:{'X-Study-User':'local_seedy'}});assert.deepEqual((await bHistory.json()).versions,[]);
 const forged=await context.request.get(root+'/api/session',{headers:{'oai-authenticated-user-id':'local_seedy','oai-authenticated-user-email':'forged@example.test'}});assert.equal((await forged.json()).user.userId,'local-preview');
 await signedIn.goto(root+'/signout-with-chatgpt?return_to=%2F',{waitUntil:'networkidle'});assert.equal((await(await accountB.request.get(root+'/api/session')).json()).user.userId,'local-preview');await accountB.close();console.log('PASS account isolation, history access, cookie signout and forged-header rejection');
 // Switching the same browser with unsent work must not attach that work to the next login.
 await page.route('**/api/records',route=>route.abort('internetdisconnected'));await page.locator('.essay-fields textarea').nth(0).fill('切換前的離線草稿');await page.waitForTimeout(700);
 await page.unroute('**/api/records');await page.goto(root+'/signin-with-chatgpt?return_to=%2F',{waitUntil:'networkidle'});
 const switched=await context.request.get(root+'/api/records',{headers:{'X-Study-User':'local_seedy'}});assert.deepEqual((await switched.json()).records,{});
 assert((await page.evaluate(()=>localStorage.getItem('police-study-pending-v2:user:local-preview'))).includes('切換前的離線草稿'));
 await page.goto(root+'/signout-with-chatgpt?return_to=%2F',{waitUntil:'networkidle'});await queueEmpty(page);assert.equal((await records())[essayKey].value.intro,'切換前的離線草稿');console.log('PASS same-browser account switch preserves the prior account queue');
 const invalid=await context.request.put(root+'/api/records',{headers,data:{key:'essay:invalid',value:{checks:[42]},updatedAt:Date.now(),baseUpdatedAt:null}});assert.equal(invalid.status(),400);
 const create=await context.request.put(root+'/api/records',{headers,data:{key:'essay:cas',value:{intro:'base'},updatedAt:Date.now(),baseUpdatedAt:null}});assert.equal(create.status(),200);const base=(await create.json()).record.updatedAt;
 const writes=await Promise.all(['first','second'].map(intro=>context.request.put(root+'/api/records',{headers,data:{key:'essay:cas',value:{intro},updatedAt:Date.now()+1000,baseUpdatedAt:base}})));assert.deepEqual(writes.map(r=>r.status()).sort(),[200,409]);console.log('PASS atomic server version checks prevent concurrent overwrite');
 await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);console.log('PASS mobile layout and no browser exceptions');
 await browser.close();browser=null;
 // Production-mode anonymous access must not use the development identity.
 const productionPort=await port();const prodRoot=`http://127.0.0.1:${productionPort}`;
 production=spawn('bash',['scripts/sites-env.sh','--',process.execPath,'--import','./scripts/sites-env.mjs','./node_modules/wrangler/bin/wrangler.js','dev','--config','dist/server/wrangler.json','--local','--persist-to',path.join(temp,'production-state'),'--ip','127.0.0.1','--port',String(productionPort),'--inspector-port','0'],{cwd:project,env:environment,detached:true,stdio:['ignore','pipe','pipe']});production.stdout.pipe(log);production.stderr.pipe(log);
 await ready(prodRoot+'/api/session',production);assert.equal((await(await fetch(prodRoot+'/api/session')).json()).user,null);assert.equal((await fetch(prodRoot+'/api/records')).status,401);assert.equal((await fetch(prodRoot+'/api/records',{method:'PUT',headers:{'Content-Type':'application/json'},body:'{}'})).status,401);console.log('PASS production anonymous GET/PUT both denied');
 succeeded=true;
}finally{
 if(browser)await browser.close();
 for(const child of [server,production])if(child&&child.exitCode===null){try{process.kill(-child.pid,'SIGTERM');}catch{/* Already exited. */}}
 await new Promise(r=>setTimeout(r,300));log.end();
 if(succeeded)await rm(temp,{recursive:true,force:true});
 else console.error('Browser check logs:',temp,'\n',(await readFile(path.join(temp,'server.log'),'utf8')).slice(-8000));
}
