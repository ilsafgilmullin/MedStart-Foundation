const CACHE_NAME = 'medstart-shell-v5'
const PUBLIC_SHELL = ['/', '/login', '/register/student', '/register/tutor']
const PRECACHE = ['/offline', '/medstart-mark.svg']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE)),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('medstart-') && key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      ),
  )
  self.clients.claim()
})

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME)
  try {
    const response = await fetch(request)
    if (response.ok) {
      const copy = response.clone()
      void cache.put(request, copy)
    }
    return response
  } catch {
    const cached = await cache.match(request)
    if (cached) return cached
    throw new Error('NETWORK_AND_CACHE_UNAVAILABLE')
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) {
    return
  }

  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname === '/medstart-mark.svg'
  ) {
    event.respondWith(networkFirst(request))
    return
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok && PUBLIC_SHELL.includes(url.pathname)) {
            const copy = response.clone()
            void caches
              .open(CACHE_NAME)
              .then((cache) => cache.put(request, copy))
          }
          return response
        })
        .catch(async () => {
          const cache = await caches.open(CACHE_NAME)
          const cached = await cache.match(request)
          return cached || cache.match('/offline')
        }),
    )
  }
})
