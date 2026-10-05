// Universe Invedors Tool Service Worker v1.0
// Provides offline shell + cache-first for static assets

const CACHE = 'ui-tools-v1'
const OFFLINE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
]

// Cache on install
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(cache) {
      return cache.addAll(OFFLINE_ASSETS).catch(function() {
        // Non-fatal — individual failures shouldn't block install
      })
    }).then(function() { return self.skipWaiting() })
  )
})

// Clean old caches on activate
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(keys.filter(function(k) { return k !== CACHE }).map(function(k) { return caches.delete(k) }))
    }).then(function() { return self.clients.claim() })
  )
})

// Fetch strategy: network-first for HTML, cache-first for everything else
self.addEventListener('fetch', function(e) {
  var url = new URL(e.request.url)
  
  // Skip cross-origin requests (CDN libraries, Google Fonts, Analytics, AdSense)
  if (url.origin !== self.location.origin) return
  
  // Network-first for HTML pages (always fresh content)
  if (e.request.headers.get('accept') && e.request.headers.get('accept').includes('text/html')) {
    e.respondWith(
      fetch(e.request).then(function(response) {
        var clone = response.clone()
        caches.open(CACHE).then(function(cache) { cache.put(e.request, clone) })
        return response
      }).catch(function() {
        return caches.match(e.request).then(function(cached) {
          return cached || caches.match('/index.html')
        })
      })
    )
    return
  }
  
  // Cache-first for static assets (CSS, JS, fonts, images)
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      if (cached) return cached
      return fetch(e.request).then(function(response) {
        if (response.ok) {
          var clone = response.clone()
          caches.open(CACHE).then(function(cache) { cache.put(e.request, clone) })
        }
        return response
      })
    })
  )
})
