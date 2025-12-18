/**
 * Custom Service Worker for Push Notifications
 * This file is imported by the main Workbox-generated service worker
 */

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
