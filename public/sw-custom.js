/**
 * Custom Service Worker for Push Notifications and PWA Install
 */

const CACHE_NAME = 'pingpong-v1'

// Take control immediately on install/activate
self.addEventListener('install', function() {
    self.skipWaiting()
})

self.addEventListener('activate', function(event) {
    // Clean up old caches
    event.waitUntil(
        caches.keys().then(function(cacheNames) {
            return Promise.all(
                cacheNames
                    .filter(function(name) { return name !== CACHE_NAME })
                    .map(function(name) { return caches.delete(name) })
            )
        }).then(function() {
            return self.clients.claim()
        })
    )
})

// Fetch handler: cache-first for static assets, network-first for API/navigation
self.addEventListener('fetch', function(event) {
    const url = new URL(event.request.url)

    // Skip non-GET requests
    if (event.request.method !== 'GET') return

    // Skip Supabase API and OneSignal requests
    if (url.hostname.includes('supabase') || url.hostname.includes('onesignal')) return

    // Navigation requests (HTML pages): network-first with offline fallback
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request)
                .then(function(response) {
                    var clone = response.clone()
                    caches.open(CACHE_NAME).then(function(cache) {
                        cache.put(event.request, clone)
                    })
                    return response
                })
                .catch(function() {
                    return caches.match(event.request).then(function(cached) {
                        return cached || caches.match('/index.html')
                    })
                })
        )
        return
    }

    // Static assets (JS, CSS, images, fonts): cache-first
    if (url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|ico|woff2?|ttf)(\?.*)?$/)) {
        event.respondWith(
            caches.match(event.request).then(function(cached) {
                if (cached) return cached
                return fetch(event.request).then(function(response) {
                    if (response.ok) {
                        var clone = response.clone()
                        caches.open(CACHE_NAME).then(function(cache) {
                            cache.put(event.request, clone)
                        })
                    }
                    return response
                })
            })
        )
        return
    }

    // All other requests: network with cache fallback
    event.respondWith(
        fetch(event.request)
            .then(function(response) {
                if (response.ok) {
                    var clone = response.clone()
                    caches.open(CACHE_NAME).then(function(cache) {
                        cache.put(event.request, clone)
                    })
                }
                return response
            })
            .catch(function() {
                return caches.match(event.request)
            })
    )
})

// Handle push notifications
self.addEventListener('push', function(event) {
    if (!event.data) {
        console.log('Push event without data')
        return
    }

    let data
    try {
        data = event.data.json()
    } catch (e) {
        console.error('Error parsing push data:', e)
        return
    }

    const options = {
        body: data.body || '',
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        vibrate: [200, 100, 200],
        tag: data.tag || 'pingpong-notification',
        renotify: true,
        requireInteraction: data.type === 'invitation', // Stay visible for invitations
        data: {
            url: data.url || '/',
            type: data.type
        },
        actions: data.actions || []
    }

    event.waitUntil(
        self.registration.showNotification(data.title || 'Ping Pong Club', options)
    )
})

// Handle notification click
self.addEventListener('notificationclick', function(event) {
    event.notification.close()

    const urlToOpen = event.notification.data?.url || '/'

    // Handle action buttons if present
    if (event.action === 'view') {
        // Default action - open the URL
    } else if (event.action === 'dismiss') {
        // Just close the notification
        return
    }

    event.waitUntil(
        clients.matchAll({
            type: 'window',
            includeUncontrolled: true
        }).then(function(clientList) {
            // Check if app is already open
            for (const client of clientList) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    // Navigate to the correct page and focus
                    return client.navigate(urlToOpen).then(() => client.focus())
                }
            }
            // Otherwise open a new window
            return clients.openWindow(urlToOpen)
        })
    )
})

// Handle notification close (for analytics if needed)
self.addEventListener('notificationclose', function(event) {
    // Could log analytics here
    console.log('Notification closed:', event.notification.tag)
})
