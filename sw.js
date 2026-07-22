const CACHE_NAME='lost-crystal-v5.3-20260723';
const APP_SHELL=['./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png'];
const scopeUrl=new URL('./',self.registration.scope);
const indexUrl=new URL('index.html',scopeUrl).href;

self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE_NAME);
    const response=await fetch(indexUrl,{cache:'reload'});
    if(!response.ok)throw new Error('index fetch failed '+response.status);
    await cache.put(indexUrl,response.clone());
    await cache.put(scopeUrl.href,response.clone());
    await Promise.allSettled(APP_SHELL.slice(1).map(async path=>{
      const url=new URL(path,scopeUrl).href;
      const r=await fetch(url,{cache:'reload'});
      if(r.ok)await cache.put(url,r);
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin)return;

  if(event.request.mode==='navigate'){
    event.respondWith((async()=>{
      const cache=await caches.open(CACHE_NAME);
      try{
        const fresh=await fetch(event.request,{cache:'no-store'});
        if(fresh&&fresh.ok){
          await cache.put(indexUrl,fresh.clone());
          await cache.put(scopeUrl.href,fresh.clone());
          return fresh;
        }
      }catch(e){}
      return (await cache.match(indexUrl))||(await cache.match(scopeUrl.href))||Response.error();
    })());
    return;
  }

  event.respondWith((async()=>{
    const cached=await caches.match(event.request,{ignoreSearch:true});
    try{
      const fresh=await fetch(event.request);
      if(fresh&&fresh.ok){
        const cache=await caches.open(CACHE_NAME);
        cache.put(event.request,fresh.clone()).catch(()=>{});
        return fresh;
      }
    }catch(e){}
    return cached||new Response('',{status:503,statusText:'Offline'});
  })());
});
