// Kamikaze SW: replaces the old Workbox SW, unregisters itself, and reloads all clients
// TODO: Remove this file after May 2026 — all users should have migrated to sw-custom.js by then
self.addEventListener('install', function() {
    self.skipWaiting()
})

self.addEventListener('activate', function(event) {
    event.waitUntil(
        caches.keys().then(function(names) {
            return Promise.all(names.map(function(n) { return caches.delete(n) }))
        }).then(function() {
            return self.registration.unregister()
        }).then(function() {
            return self.clients.matchAll()
        }).then(function(clients) {
            clients.forEach(function(client) { client.navigate(client.url) })
        })
    )
})
