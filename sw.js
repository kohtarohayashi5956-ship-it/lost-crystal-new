const CACHE_NAME='beginning-crystal-v1.4.3-offline-1';
const CORE_ASSETS=['./','./index.html','./manifest.webmanifest','./icon-180.png','./icon-192.png','./icon-512.png'];
async function cacheCore(){const cache=await caches.open(CACHE_NAME);await cache.addAll(CORE_ASSETS)}
self.addEventListener('install',event=>{event.waitUntil(cacheCore().then(()=>self.skipWaiting()))});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{const keys=await caches.keys();await Promise.all(keys.filter(k=>k.startsWith('beginning-crystal-')&&k!==CACHE_NAME).map(k=>caches.delete(k)));await self.clients.claim()})())});
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting();if(event.data?.type==='CACHE_NOW')event.waitUntil(cacheCore())});
self.addEventListener('fetch',event=>{const request=event.request;if(request.method!=='GET')return;const url=new URL(request.url);const scopePath=new URL(self.registration.scope).pathname;if(url.origin!==self.location.origin||!url.pathname.startsWith(scopePath))return;
 if(request.mode==='navigate'){event.respondWith((async()=>{try{const response=await fetch(request);if(response&&response.ok){const cache=await caches.open(CACHE_NAME);cache.put('./index.html',response.clone())}return response}catch(e){return (await caches.match(request,{ignoreSearch:true}))||(await caches.match('./index.html'))||(await caches.match('./'))}})());return}
 event.respondWith((async()=>{const cached=await caches.match(request,{ignoreSearch:true});if(cached)return cached;try{const response=await fetch(request);if(response&&response.ok){const cache=await caches.open(CACHE_NAME);cache.put(request,response.clone())}return response}catch(e){return new Response('',{status:504,statusText:'Offline'})}})())});
