const CACHE = 'dpsa-v2'
const ASSETS = ['.','index.html','styles.css','app.js','lessons.json','manifest.json']

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)))
  self.skipWaiting()
})

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys=>Promise.all(
      keys.map(k=>{ if(k!==CACHE) return caches.delete(k); return Promise.resolve() })
    )).then(()=>self.clients.claim())
  )
})

self.addEventListener('fetch', e => {
  // network-first for navigation, cache-first for other assets
  if(e.request.mode === 'navigate'){
    e.respondWith(fetch(e.request).catch(()=>caches.match('index.html')))
    return
  }
  e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(res=>{
    // put a copy in cache
    const copy = res.clone()
    caches.open(CACHE).then(c=>c.put(e.request, copy))
    return res
  }).catch(()=>caches.match(e.request))))
})
