import {createHash} from 'node:crypto'
import type {Plugin} from 'vite'

/** A new worker becomes active only after its full core and selected fonts are cached. */
export function offlinePlugin():Plugin {
  let base='/'
  return {name:'learning-offline',enforce:'post',apply:'build',configResolved(config){base=config.base.startsWith('/')?config.base:'/'},generateBundle(_,bundle){
    if(process.env.UNI_PLATFORM==='app')return
    const files=Object.keys(bundle).filter(file=>/\.(?:js|css|html)$/.test(file)||file.startsWith('static/database/')||file.startsWith('static/pdf/'))
    if(!files.includes('index.html'))throw new Error('Offline core must contain index.html')
    const version=createHash('sha256').update(files.map(file=>{const item=bundle[file]!;return file+(item.type==='chunk'?item.code:String(item.source))}).join('\n')).digest('hex').slice(0,20)
    const core=[...new Set(files.map(file=>base+encodeURI(file)))]
    const source=String.raw`
const BASE=__BASE__,VERSION=__VERSION__,CORE=__CORE__;
const PREFIX='font-learning-offline-'+BASE.replace(/\W/g,'_')+'-';
const fonts=[...new Set(new URL(self.location.href).searchParams.getAll('font').map(path=>new URL(path,self.location.href)).filter(url=>url.origin===self.location.origin&&url.pathname.startsWith(BASE)&&/\/(?:assets|static\/fronts)\/.*\.(ttf|woff2?)$/i.test(url.pathname)).map(url=>url.href))].sort();
let hash=2166136261;for(const character of fonts.join('|'))hash=Math.imul(hash^character.charCodeAt(0),16777619);
const NAME=PREFIX+VERSION+'-'+(hash>>>0).toString(36),META=new URL(BASE+'__offline_meta__',self.location.href).href;
self.addEventListener('install',event=>event.waitUntil((async()=>{
  const previous=await caches.has(NAME);const cache=await caches.open(NAME);
  try{await cache.addAll([...CORE,...fonts].map(url=>new Request(url,{cache:'reload'})));await cache.put(META,new Response(JSON.stringify({ready:true,version:VERSION,files:CORE.length+fonts.length,fonts,preparedAt:new Date().toISOString()})));await self.skipWaiting()}
  catch(error){if(!previous)await caches.delete(NAME);throw error}
})()));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('message',event=>{
  if(event.data?.type!=='OFFLINE_STATUS'||!event.ports[0])return;
  event.waitUntil((async()=>{try{const response=await(await caches.open(NAME)).match(META);event.ports[0].postMessage(response?await response.json():{ready:false})}catch(error){event.ports[0].postMessage({ready:false,error:String(error)})}})());
});
self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url);
  if(request.method!=='GET'||url.origin!==self.location.origin||!url.pathname.startsWith(BASE))return;
  if(request.mode!=='navigate'&&!url.pathname.startsWith(BASE+'assets/')&&!url.pathname.startsWith(BASE+'static/'))return;
  event.respondWith((async()=>{
    const cache=await caches.open(NAME);const key=request.mode==='navigate'?BASE+'index.html':request;
    const cached=await cache.match(key);if(cached)return cached;
    for(const name of await caches.keys()){if(name===NAME||!name.startsWith(PREFIX))continue;const old=await(await caches.open(name)).match(key);if(old)return old}
    const response=await fetch(request);
    if(response.ok&&request.mode!=='navigate')event.waitUntil(cache.put(request,response.clone()).catch(error=>console.warn('Offline cache write failed',error)));
    return response;
  })());
});
`.replace('__BASE__',JSON.stringify(base)).replace('__VERSION__',JSON.stringify(version)).replace('__CORE__',JSON.stringify(core))
    this.emitFile({type:'asset',fileName:'service-worker.js',source})
  }}
}
