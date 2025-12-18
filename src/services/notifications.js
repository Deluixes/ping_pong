/**
 * Push Notification Service using OneSignal
 * Handles subscription management and user preferences
 */

import { supabase } from '../lib/supabase'

const ONESIGNAL_APP_ID = import.meta.env.VITE_ONESIGNAL_APP_ID

// Debug logging
console.log('[NotificationService] ONESIGNAL_APP_ID:', ONESIGNAL_APP_ID ? 'configured' : 'MISSING!')

class NotificationService {

    constructor() {
        this._initialized = false
        this._initPromise = null
    }

    // ==================== ONESIGNAL INITIALIZATION ====================

    /**
     * Initialize OneSignal SDK
     */
    async _initOneSignal() {
        if (this._initialized) return true
        if (this._initPromise) return this._initPromise

        this._initPromise = new Promise((resolve) => {
            if (!ONESIGNAL_APP_ID) {
                console.error('ONESIGNAL_APP_ID not configured')
                resolve(false)
                return
            }

            // Check if OneSignal is already loaded
            if (window.OneSignalDeferred) {
                window.OneSignalDeferred.push(async (OneSignal) => {
                    this._initialized = true
                    resolve(true)
                })
                return
            }

            // Load OneSignal SDK
            window.OneSignalDeferred = window.OneSignalDeferred || []

            const script = document.createElement('script')
            script.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js'
            script.defer = true

            script.onload = () => {
                window.OneSignalDeferred.push(async (OneSignal) => {
                    try {
                        await OneSignal.init({
                            appId: ONESIGNAL_APP_ID,
                            allowLocalhostAsSecureOrigin: true,
                            notifyButton: { enable: false },
                            welcomeNotification: { disable: true }
                        })
                        this._initialized = true
                        resolve(true)
                    } catch (error) {
                        console.error('OneSignal init error:', error)
                        resolve(false)
                    }
                })
            }

            script.onerror = () => {
                console.error('Failed to load OneSignal SDK')
                resolve(false)
            }

            document.head.appendChild(script)
        })

        return this._initPromise
    }

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

        await this._initOneSignal()

        if (window.OneSignalDeferred) {
            return new Promise((resolve) => {
                window.OneSignalDeferred.push(async (OneSignal) => {
                    try {
                        await OneSignal.Slidedown.promptPush()
                        const permission = await OneSignal.Notifications.permission
                        resolve(permission ? 'granted' : 'denied')
                    } catch {
                        resolve(Notification.permission)
                    }
                })
            })
        }

        return Notification.permission
    }

    // ==================== SUBSCRIPTION MANAGEMENT ====================

    /**
     * Subscribe user to push notifications via OneSignal
     * @param {string} userId - The user's ID
     * @returns {Promise<{success: boolean, error?: string}>}
     */
    async subscribe(userId) {
        if (!this.isSupported()) {
            return { success: false, error: 'Notifications non supportées sur ce navigateur' }
        }

        const initialized = await this._initOneSignal()
        if (!initialized) {
            return { success: false, error: 'Configuration manquante' }
        }

        return new Promise((resolve) => {
            window.OneSignalDeferred.push(async (OneSignal) => {
                try {
                    console.log('[NotificationService] Starting subscription for user:', userId)

                    // Request permission
                    console.log('[NotificationService] Requesting permission...')
                    await OneSignal.Slidedown.promptPush()

                    const permission = await OneSignal.Notifications.permission
                    console.log('[NotificationService] Permission result:', permission)

                    if (!permission) {
                        resolve({ success: false, error: 'Permission refusée' })
                        return
                    }

                    // Set external user ID (links OneSignal to our user)
                    console.log('[NotificationService] Calling OneSignal.login with userId:', userId)
                    await OneSignal.login(userId)
                    console.log('[NotificationService] Login successful')

                    // Add tags for filtering (license type, etc.)
                    const profile = await this._getUserProfile(userId)
                    console.log('[NotificationService] User profile:', profile)

                    if (profile?.licenseType) {
                        await OneSignal.User.addTags({
                            license_type: profile.licenseType,
                            user_id: userId
                        })
                        console.log('[NotificationService] Tags added')
                    }

                    console.log('[NotificationService] Subscription complete!')
                    resolve({ success: true })
                } catch (error) {
                    console.error('[NotificationService] OneSignal subscription error:', error)
                    resolve({ success: false, error: error.message })
                }
            })
        })
    }

    /**
     * Get user profile for tagging
     */
    async _getUserProfile(userId) {
        const { data } = await supabase
            .from('members')
            .select('license_type')
            .eq('user_id', userId)
            .single()
        return data ? { licenseType: data.license_type } : null
    }

    /**
     * Unsubscribe user from push notifications
     * @param {string} userId - The user's ID
     */
    async unsubscribe(userId) {
        const initialized = await this._initOneSignal()
        if (!initialized) return { success: true }

        return new Promise((resolve) => {
            window.OneSignalDeferred.push(async (OneSignal) => {
                try {
                    await OneSignal.logout()
                    resolve({ success: true })
                } catch (error) {
                    console.error('OneSignal unsubscribe error:', error)
                    resolve({ success: false, error: error.message })
                }
            })
        })
    }

    /**
     * Check if user is currently subscribed to push
     */
    async isSubscribed() {
        if (!this.isSupported()) return false

        const initialized = await this._initOneSignal()
        if (!initialized) return false

        return new Promise((resolve) => {
            window.OneSignalDeferred.push(async (OneSignal) => {
                try {
                    const permission = await OneSignal.Notifications.permission
                    resolve(permission)
                } catch {
                    resolve(false)
                }
            })
        })
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
            console.error('Error fetching preferences:', error)
        }

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

        // Update OneSignal tags for filtering
        const initialized = await this._initOneSignal()
        if (initialized) {
            window.OneSignalDeferred.push(async (OneSignal) => {
                await OneSignal.User.addTags({
                    invitations_enabled: preferences.invitations_enabled ? 'true' : 'false',
                    slot_openings_enabled: preferences.slot_openings_enabled ? 'true' : 'false'
                })
            })
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

        // Set default preferences with notifications enabled
        await this.updatePreferences(userId, {
            enabled: true,
            invitations_enabled: true,
            slot_openings_enabled: true
        })
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