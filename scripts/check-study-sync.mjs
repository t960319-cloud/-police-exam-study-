import assert from 'node:assert/strict';
import { register } from 'node:module';
import { test, afterEach } from 'node:test';
register(`data:text/javascript,${encodeURIComponent(`
export async function resolve(specifier, context, next) {
 try { return await next(specifier, context); }
 catch (error) { if(error.code==='ERR_MODULE_NOT_FOUND' && specifier.startsWith('.') && !/\\.[a-z]+$/.test(specifier))return next(specifier+'.ts',context);throw error; }
}`)}`, import.meta.url);
const {createStudyStore}=await import('../lib/study-sync.ts');
const {CACHE_KEY,QUEUE_KEY,scopedKeys,validBackupEntry}=await import('../lib/study-records.ts');
globalThis.window=new EventTarget();globalThis.document=new EventTarget();document.visibilityState='visible';
const stamp=Date.now();const entry=(value,offset=0)=>({value,updatedAt:stamp+offset});
const disposers=[];afterEach(()=>{for(const dispose of disposers.splice(0))dispose();});
class MemoryStorage{data=new Map();getItem(key){return this.data.get(key)??null;}setItem(key,value){this.data.set(key,value);}}
function server(initial={}){
 const users={A:structuredClone(initial),B:{}};const histories={};let user='A';let online=true;let serial=stamp+100;const calls=[];
 const request=async(url,init)=>{
  if(!online)throw Error('offline');calls.push({url,init});
  if(url==='/api/session')return Response.json({user:user?{userId:user,displayName:user,mode:'account'}:null});
  const requested=new Headers(init?.headers).get('X-Study-User');
  if(!user)return Response.json({code:'signed_out'},{status:401});
  if(requested!==user)return Response.json({code:'account_changed'},{status:409});
  if(url.includes('?history=')){const key=decodeURIComponent(url.split('?history=')[1]);return Response.json({userId:user,versions:histories[user]?.[key]??[]});}
  const rows=users[user]??(users[user]={});
  if(init?.method==='PUT'){
   const {key,value,updatedAt,baseUpdatedAt}=JSON.parse(init.body);const current=rows[key];
   if((current?.updatedAt??null)!==baseUpdatedAt)return Response.json({code:'conflict',userId:user,key,record:current??null},{status:409});
   if(current){histories[user]??={};histories[user][key]=[structuredClone(current),...(histories[user][key]??[])].slice(0,20);}
   const record={value,updatedAt:Math.max(++serial,updatedAt,(baseUpdatedAt??0)+1)};rows[key]=record;
   return Response.json({userId:user,key,record});
  }
  return Response.json({userId:user,records:rows});
 };
 return {request,users,histories,calls,setUser:value=>{user=value;},offline:()=>{online=false;},online:()=>{online=true;}};
}
function mount(remote=server(),storage=new MemoryStorage(),request=remote.request){
 const store=createStudyStore({storage,request,now:()=>stamp});const stop=store.subscribe(()=>{});disposers.push(stop);
 return {store,storage,remote,stop,ready:()=>store.refresh(),queue:()=>JSON.parse(storage.getItem(scopedKeys(store.getSnapshot().user?.userId??null).queue)||'{}')};
}

test('offline draft survives reload after identity is confirmed, then syncs',async()=>{
 const remote=server();const a=mount(remote);await a.ready();remote.offline();a.store.put('essay:one',{analysis:'離線草稿',checks:['法源']});await a.ready();assert.equal(a.store.getSnapshot().sync,'offline');a.stop();
 const b=mount(remote,a.storage);await b.ready();assert.deepEqual(b.store.getSnapshot().records,{},'Never expose an unidentified account cache');remote.online();await b.ready();
 assert.equal(b.store.read('essay:one',{}).analysis,'離線草稿');assert.equal(remote.users.A['essay:one'].value.analysis,'離線草稿');assert.deepEqual(b.queue(),{});
});
test('an edit during an in-flight PUT is saved against the acknowledged version',async()=>{
 const remote=server();let release,entered;let block=false;const gate=new Promise(r=>{release=r;});const started=new Promise(r=>{entered=r;});
 const a=mount(remote,undefined,async(url,init)=>{if(block&&init?.method==='PUT'){block=false;entered();await gate;}return remote.request(url,init);});await a.ready();
 block=true;a.store.put('essay:one',{analysis:'第一版'});const syncing=a.ready();await started;a.store.put('essay:one',{analysis:'第二版'});release();await syncing;
 assert.equal(remote.users.A['essay:one'].value.analysis,'第二版');assert.deepEqual(a.queue(),{});
});
test('two devices retain both conflicting drafts until an explicit choice',async()=>{
 const remote=server({'essay:one':entry({analysis:'共同原稿'})});const a=mount(remote),b=mount(remote);await Promise.all([a.ready(),b.ready()]);
 a.store.put('essay:one',{analysis:'裝置A'});b.store.put('essay:one',{analysis:'裝置B'});await a.ready();await b.ready();
 const conflict=b.store.getSnapshot().conflicts['essay:one'];assert.equal(conflict.local.value.analysis,'裝置B');assert.equal(conflict.remote.value.analysis,'裝置A');assert.equal(remote.users.A['essay:one'].value.analysis,'裝置A');
 b.store.resolveConflict('essay:one','local');await b.ready();assert.equal(remote.users.A['essay:one'].value.analysis,'裝置B');assert.deepEqual(b.store.getSnapshot().conflicts,{});
 assert((await b.store.loadHistory('essay:one')).some(r=>r.value.analysis==='裝置A'));
});
test('choosing the remote version cannot resurrect the rejected local cache',async()=>{
 const remote=server({'essay:one':entry({intro:'base'})});const a=mount(remote);await a.ready();
 a.store.put('essay:one',{intro:'local'});remote.users.A['essay:one']=entry({intro:'remote'},20);await a.ready();a.store.resolveConflict('essay:one','remote');await a.ready();
 assert.equal(a.store.read('essay:one',{}).intro,'remote');assert.deepEqual(a.queue(),{});assert((await a.store.loadHistory('essay:one')).some(r=>r.value.intro==='local'));
});
test('a CAS conflict arriving between GET and PUT is retained',async()=>{
 const remote=server({'essay:one':entry({intro:'base'})});let race=false;
 const a=mount(remote,undefined,async(url,init)=>{if(race&&init?.method==='PUT'){race=false;remote.users.A['essay:one']=entry({intro:'raced'},30);}return remote.request(url,init);});await a.ready();
 a.store.put('essay:one',{intro:'local'});race=true;await a.ready();assert.equal(a.store.getSnapshot().conflicts['essay:one'].remote.value.intro,'raced');assert.equal(remote.users.A['essay:one'].value.intro,'raced');
});
test('conflicts and the original base version survive a reload',async()=>{
 const remote=server({'essay:one':entry({intro:'base'})});const a=mount(remote);await a.ready();a.store.put('essay:one',{intro:'local'});remote.users.A['essay:one']=entry({intro:'remote'},30);await a.ready();a.stop();
 const b=mount(remote,a.storage);await b.ready();assert.equal(b.store.getSnapshot().conflicts['essay:one'].local.value.intro,'local');assert.equal(b.queue()['essay:one'].baseUpdatedAt,stamp);
});
test('a successful PUT with a lost response is acknowledged idempotently on retry',async()=>{
 const remote=server();let fail=false;const a=mount(remote,undefined,async(url,init)=>{const response=await remote.request(url,init);if(fail&&init?.method==='PUT'){fail=false;throw Error('lost response');}return response;});await a.ready();
 a.store.put('essay:one',{intro:'saved'});fail=true;await a.ready();assert(Object.keys(a.queue()).length);await a.ready();assert.deepEqual(a.queue(),{});assert.deepEqual(a.store.getSnapshot().conflicts,{});
});
test('account switches never upload another account pending queue',async()=>{
 const remote=server();const a=mount(remote);await a.ready();remote.offline();a.store.put('essay:one',{intro:'A private'});await a.ready();remote.setUser('B');remote.online();await a.ready();
 assert.equal(a.store.getSnapshot().user.userId,'B');assert.deepEqual(a.store.getSnapshot().records,{});assert.deepEqual(remote.users.B,{});
 remote.setUser('A');await a.ready();assert.equal(a.store.read('essay:one',{}).intro,'A private');assert.equal(remote.users.A['essay:one'].value.intro,'A private');
});
test('server-side account recheck stops a cookie switch between GET and PUT',async()=>{
 const remote=server();let switchNow=false;const a=mount(remote,undefined,async(url,init)=>{if(switchNow&&init?.method==='PUT'){switchNow=false;remote.setUser('B');}return remote.request(url,init);});await a.ready();
 a.store.put('essay:one',{intro:'A private'});switchNow=true;await a.ready();assert.deepEqual(remote.users.B,{});assert.equal(a.store.getSnapshot().user.userId,'B');assert.deepEqual(a.store.getSnapshot().records,{});
});
test('signout hides account records and anonymous work stays separate after login',async()=>{
 const remote=server({'essay:one':entry({intro:'private'})});const a=mount(remote);await a.ready();remote.setUser(null);await a.ready();assert.deepEqual(a.store.getSnapshot().records,{});
 a.store.put('essay:guest',{intro:'guest'});await a.ready();remote.setUser('B');await a.ready();assert.deepEqual(remote.users.B,{});assert.deepEqual(a.store.getSnapshot().records,{});assert(a.storage.getItem(scopedKeys(null).queue).includes('guest'));
});
test('explicit signout lock ignores a late read response',async()=>{
 const remote=server({'essay:one':entry({intro:'private'})});let release,entered;let delay=false;const gate=new Promise(r=>{release=r;});const started=new Promise(r=>{entered=r;});
 const a=mount(remote,undefined,async(url,init)=>{const response=await remote.request(url,init);if(delay&&url==='/api/records'){delay=false;entered();await gate;}return response;});await a.ready();
 delay=true;const read=a.ready();await started;a.store.lock();release();await read;assert.deepEqual(a.store.getSnapshot().records,{});assert.equal(a.store.getSnapshot().user,null);
});
test('legacy unscoped records are exportable but never auto-uploaded',async()=>{
 const storage=new MemoryStorage();storage.setItem(CACHE_KEY,JSON.stringify({'essay:legacy':entry({intro:'unknown owner'})}));storage.setItem(QUEUE_KEY,storage.getItem(CACHE_KEY));
 const remote=server();const a=mount(remote,storage);await a.ready();assert.equal(a.store.getSnapshot().legacyAvailable,true);assert.deepEqual(remote.users.A,{});assert.equal(a.store.legacyRecords()['essay:legacy'].value.intro,'unknown owner');assert(storage.getItem(CACHE_KEY));
});
test('a damaged cache cannot erase a valid account-specific pending queue',async()=>{
 const storage=new MemoryStorage();const keys=scopedKeys('A');storage.setItem(keys.cache,'{broken');storage.setItem(keys.queue,JSON.stringify({'essay:one':{...entry({intro:'recover'}),baseUpdatedAt:null}}));
 const a=mount(server(),storage);await a.ready();assert.equal(a.remote.users.A['essay:one'].value.intro,'recover');
});
test('storage failures are reactive while in-memory work still syncs',async()=>{
 const a=mount(server(),{getItem(){throw Error('denied');},setItem(){throw Error('denied');}});await a.ready();a.store.put('essay:one',{intro:'memory'});await a.ready();assert.equal(a.store.getSnapshot().storageFailed,true);assert.equal(a.remote.users.A['essay:one'].value.intro,'memory');
});
test('cross-tab edits preserve independent pending records before storage events',async()=>{
 const remote=server();const storage=new MemoryStorage();const a=mount(remote,storage),b=mount(remote,storage);await Promise.all([a.ready(),b.ready()]);remote.offline();a.store.put('essay:one',{intro:'A'});b.store.put('essay:two',{intro:'B'});assert.deepEqual(Object.keys(b.queue()).sort(),['essay:one','essay:two']);
});
test('backup validation is atomic and preserves timestamps and newer records',async()=>{
 const a=mount(server({'essay:one':entry({intro:'remote'},20)}));await a.ready();assert.equal(a.store.importRecords({'essay:one':entry({intro:'older'},10)}),0);
 assert.throws(()=>a.store.importRecords({'essay:two':entry({intro:'valid'}),'essay:bad':entry({checks:[42]})}));assert.equal(a.store.read('essay:two',null),null);
 assert.equal(a.store.importRecords({'essay:two':entry({intro:'import'},5)}),1);assert.equal(a.queue()['essay:two'].updatedAt,stamp+5);await a.ready();assert.equal(a.remote.users.A['essay:two'].value.intro,'import');
});
test('restoring a prior version creates a new conditional write',async()=>{
 const a=mount(server({'essay:one':entry({intro:'old'})}));await a.ready();a.store.put('essay:one',{intro:'new'});await a.ready();const previous=(await a.store.loadHistory('essay:one')).find(r=>r.value.intro==='old');assert(previous);a.store.put('essay:one',previous.value);await a.ready();assert.equal(a.remote.users.A['essay:one'].value.intro,'old');assert(a.remote.users.A['essay:one'].updatedAt>previous.updatedAt);
});
test('damaged progress and invalid timestamps are rejected',()=>{
 assert.equal(validBackupEntry('q:one',entry({status:'review',attempts:1,correct:2,bookmarked:false,wrong:true})),false);
 assert.equal(validBackupEntry('essay:one',entry({checks:[42]})),false);assert.equal(validBackupEntry('day:one',entry({questions:[],tasks:[],essays:[],seconds:-1})),false);assert.equal(validBackupEntry('essay:one',{value:{intro:'x'},updatedAt:Infinity}),false);
});

test('an asynchronous backup import cannot cross a later account switch',async()=>{
 const remote=server();const a=mount(remote);await a.ready();const originalUser=a.store.getSnapshot().user.userId;remote.setUser('B');await a.ready();
 assert.throws(()=>a.store.importRecords({'essay:one':entry({intro:'A backup'})},originalUser));assert.deepEqual(a.store.getSnapshot().records,{});assert.deepEqual(remote.users.B,{});
});

test('an inconsistent session cannot cause an unbounded authorization retry loop',async()=>{
 const remote=server();let reads=0;const a=mount(remote,undefined,async(url,init)=>{if(url==='/api/records'){reads++;return Response.json({code:'signed_out'},{status:401});}return remote.request(url,init);});
 await a.ready();assert.equal(a.store.getSnapshot().sync,'offline');assert.equal(reads,3);assert.deepEqual(a.store.getSnapshot().records,{});
});
