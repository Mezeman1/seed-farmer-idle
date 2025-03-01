/**
 * Custom service worker for improved PWA update handling
 * This file will be injected into the generated service worker
 */

// This line is required for Workbox to inject the precache manifest
self.__WB_MANIFEST

// Force clients to update when a new service worker is activated
self.addEventListener('activate', event => {
  // Claim clients immediately
  event.waitUntil(clients.claim())

  // Notify all clients that the service worker has been updated
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({ type: 'SW_UPDATED' })
    })
  })
})

// Listen for messages from clients
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})
