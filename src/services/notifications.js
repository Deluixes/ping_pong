/**
 * Push Notification Service
 * Handles subscription management and user preferences
 */

import { supabase } from '../lib/supabase'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY

class NotificationService {

    // ==================== SUPPORT & PERMISSION ====================

    /**
     * Check if push notifications are supported
     */
    isSupported() {
        return 'serviceWorker' in navigator &&
               'PushManager' in window &&
               'Notification' in window
    }

    /**
     * Get current notification permission status
     * @returns {'default' | 'granted' | 'denied'}
     */
    getPermissionStatus() {
        if (!this.isSupported()) return 'denied'
        return Notification.permission
    }

    /**
     * Request notification permission from user
     * @returns {Promise<'granted' | 'denied' | 'default'>}
     */
    async requestPermission() {
        if (!this.isSupported()) return 'denied'
        return await Notification.requestPermission()
    }

    // ==================== SUBSCRIPTION MANAGEMENT ====================

    /**
     * Convert VAPID public key from base64 to Uint8Array
     */
    _urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4)
        const base64 = (base64String + padding)
            .replace(/-/g, '+')
            .replace(/_/g, '/')

        const rawData = window.atob(base64)
        const outputArray = new Uint8Array(rawData.length)

        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i)
        }
        return outputArray
    }

    /**
     * Subscribe user to push notifications
     * @param {string} userId - The user's ID
     * @returns {Promise<{success: boolean, error?: string}>}
     */
    async subscribe(userId) {
        if (!this.isSupported()) {
            return { success: false, error: 'Notifications non supportées sur ce navigateur' }
        }

        if (!VAPID_PUBLIC_KEY) {
            console.error('VAPID_PUBLIC_KEY not configured')
            return { success: false, error: 'Configuration manquante' }
        }

        const permission = await this.requestPermission()
        if (permission !== 'granted') {
            return { success: false, error: 'Permission refusée' }
        }

        try {
            const registration = await navigator.serviceWorker.ready

            // Check if already subscribed
            let subscription = await registration.pushManager.getSubscription()

            if (!subscription) {
                // Create new subscription
                subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: this._urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
                })
            }

            // Save subscription to database
            const subscriptionJson = subscription.toJSON()

            const { error } = await supabase
                .from('push_subscriptions')
                .upsert({
                    user_id: userId,
                    endpoint: subscriptionJson.endpoint,
                    p256dh: subscriptionJson.keys.p256dh,
                    auth: subscriptionJson.keys.auth,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'user_id,endpoint'
                })

            if (error) {
                console.error('Error saving subscription:', error)
                return { success: false, error: 'Erreur lors de l\'enregistrement' }
            }

            return { success: true }
        } catch (error) {
            console.error('Subscription error:', error)
            return { success: false, error: error.message }
        }
    }

    /**
     * Unsubscribe user from push notifications
     * @param {string} userId - The user's ID
     */
    async unsubscribe(userId) {
        try {
            const registration = await navigator.serviceWorker.ready
            const subscription = await registration.pushManager.getSubscription()

            if (subscription) {
                await subscription.unsubscribe()
            }

            // Remove all subscriptions for this user from database
            await supabase
                .from('push_subscriptions')
                .delete()
                .eq('user_id', userId)

            return { success: true }
        } catch (error) {
            console.error('Unsubscribe error:', error)
            return { success: false, error: error.message }
        }
    }

    /**
     * Check if user is currently subscribed to push
     */
    async isSubscribed() {
        if (!this.isSupported()) return false

        try {
            const registration = await navigator.serviceWorker.ready
            const subscription = await registration.pushManager.getSubscription()
            return !!subscription
        } catch {
            return false
        }
    }

    // ==================== PREFERENCES ====================

    /**
     * Get user's notification preferences
     * @param {string} userId
     */
    async getPreferences(userId) {
        const { data, error } = await supabase
            .from('notification_preferences')
            .select('*')
            .eq('user_id', userId)
            .single()

        if (error && error.code !== 'PGRST116') {
            // PGRST116 = no rows returned (not an error, just no preferences yet)
            console.error('Error fetching preferences:', error)
        }

        // Return defaults if no preferences exist
        return data || {
            enabled: false,
            invitations_enabled: true,
            slot_openings_enabled: true
        }
    }

    /**
     * Update user's notification preferences
     * @param {string} userId
     * @param {object} preferences
     */
    async updatePreferences(userId, preferences) {
        const { error } = await supabase
            .from('notification_preferences')
            .upsert({
                user_id: userId,
                ...preferences,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'user_id'
            })

        if (error) {
            console.error('Error updating preferences:', error)
            return { success: false, error: error.message }
        }

        return { success: true }
    }

    /**
     * Enable notifications (subscribe + update preferences)
     * @param {string} userId
     */
    async enableNotifications(userId) {
        const result = await this.subscribe(userId)
        if (!result.success) return result

        await this.updatePreferences(userId, { enabled: true })
        return { success: true }
    }

    /**
     * Disable notifications (unsubscribe + update preferences)
     * @param {string} userId
     */
    async disableNotifications(userId) {
        await this.unsubscribe(userId)
        await this.updatePreferences(userId, { enabled: false })
        return { success: true }
    }

    /**
     * Test notification (for debugging)
     */
    async sendTestNotification() {
        if (!this.isSupported()) return
        if (Notification.permission !== 'granted') return

        const registration = await navigator.serviceWorker.ready
        await registration.showNotification('Test - Ping Pong Club', {
            body: 'Les notifications fonctionnent !',
            icon: '/pwa-192x192.png',
            badge: '/pwa-192x192.png',
            vibrate: [200, 100, 200],
            tag: 'test-notification'
        })
    }
}

export const notificationService = new NotificationService()
