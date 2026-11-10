// Read access from the current Sites get_site response and pass it on stdin only.
import readline from 'node:readline';
if(process.stdin.isTTY)process.stdin.setRawMode(true);
const reader=readline.createInterface({input:process.stdin,terminal:false});
console.log('Ready for legal updater JSON on stdin (input is hidden).');
const line=await new Promise((resolve,reject)=>{reader.once('line',resolve);reader.once('close',()=>reject(new Error('No updater input.')));});
reader.close();process.stdin.pause();
const input=JSON.parse(line);
const url=new URL('/api/legal-updates',input.siteUrl);
if(url.protocol!=='https:'||!url.hostname.endsWith('.chatgpt.site')||typeof input.token!=='string'||!input.token)throw new Error('Use the exact current Site URL and service-access value.');
const headers={'OAI-Sites-Authorization':`Bearer ${input.token}`};
const request=async(method,body)=>{const r=await fetch(url,{method,headers:{...headers,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});const raw=await r.text();if(!r.ok)throw new Error(`Updater HTTP ${r.status}: ${raw.slice(0,500)}`);return JSON.parse(raw);};
if(input.event)throw new Error('Public writes are disabled; append the reviewed event to lib/curated-updates.json and publish from source.');
console.log(JSON.stringify(await request('GET')));
