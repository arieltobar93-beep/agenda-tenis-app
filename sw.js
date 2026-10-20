// Agenda de Tenis: guarda la app en el teléfono para que abra rápido y sin señal.
const CACHE='agenda-tenis-v1';
const SHELL=['./','index.html','config.js','manifest.json','icons/icon-192.png','icons/icon-512.png','icons/maskable-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  const req=e.request; if(req.method!=='GET')return;
  const url=new URL(req.url);
  if(url.origin===location.origin){ // archivos propios: red primero, copia guardada sin señal
    e.respondWith(fetch(req).then(r=>{if(r.ok){const cp=r.clone();caches.open(CACHE).then(c=>c.put(req.mode==='navigate'?'index.html':req,cp))}return r})
      .catch(()=>caches.match(req.mode==='navigate'?'index.html':req,{ignoreSearch:true})));return;
  }
  if(/fonts\.googleapis\.com|fonts\.gstatic\.com|cdn\.jsdelivr\.net/.test(url.host)){ // letras y librería: copia guardada primero
    e.respondWith(caches.match(req).then(hit=>hit||fetch(req).then(r=>{const cp=r.clone();caches.open(CACHE).then(c=>c.put(req,cp));return r})));
  }
  // Supabase (tus datos) siempre va directo a internet
});
