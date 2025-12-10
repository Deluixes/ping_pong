/**
 * Storage Service
 * Handles data persistence using window.storage (if available - Claude context) 
 * or falls back to localStorage.
 */

const STORAGE_KEY_USERS = 'pingpong_users'
const STORAGE_KEY_EVENTS = 'pingpong_events'

// Helper to simulate async behavior (since window.storage might be async in reality, or for future backend)
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

class StorageService {
    constructor() {
        this.useLocalStorage = true

        // Check if Claude's window.storage exists (Hypothetical API for this task)
        if (typeof window !== 'undefined' && window.storage) {
            this.useLocalStorage = false
            console.log('Using window.storage for persistence')
        }
    }

    async getUsers() {
        await delay(100)
        if (this.useLocalStorage) {
            const data = localStorage.getItem(STORAGE_KEY_USERS)
            return data ? JSON.parse(data) : []
        }
        // Implement window.storage logic here if mapped
        return []
    }

    async saveUser(user) {
        await delay(100)
        const users = await this.getUsers()
        // Check if user exists
        const existingIndex = users.findIndex(u => u.id === user.id)
        if (existingIndex >= 0) {
            users[existingIndex] = user
        } else {
            users.push(user)
        }

        if (this.useLocalStorage) {
            localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users))
        }
        return user
    }

    // Events = { date, slotId, userId, tableNumber? }
    async getEvents() {
        await delay(100)
        if (this.useLocalStorage) {
            const data = localStorage.getItem(STORAGE_KEY_EVENTS)
            return data ? JSON.parse(data) : []
        }
        return []
    }

    async registerForSlot(slotId, date, userId, userName, tableNumber = null, duration = 1) {
        await delay(100)
        let events = await this.getEvents()

        // Check if user already registered for this slot
        const existingIndex = events.findIndex(
            e => e.slotId === slotId && e.date === date && e.userId === userId
        )

        if (existingIndex >= 0) {
            // Already registered, do nothing (or could update table)
            return events
        }

        // Add new registration with userName included
        events.push({ slotId, date, userId, userName, tableNumber, duration })

        if (this.useLocalStorage) {
            localStorage.setItem(STORAGE_KEY_EVENTS, JSON.stringify(events))
        }
        return events
    }

    async unregisterFromSlot(slotId, date, userId) {
        await delay(100)
        let events = await this.getEvents()

        const existingIndex = events.findIndex(
            e => e.slotId === slotId && e.date === date && e.userId === userId
        )

        if (existingIndex >= 0) {
            events.splice(existingIndex, 1)
        }

        if (this.useLocalStorage) {
            localStorage.setItem(STORAGE_KEY_EVENTS, JSON.stringify(events))
        }
        return events
    }

    // Legacy toggle (kept for compatibility but prefer register/unregister)
    async toggleEventAttendance(slotId, date, userId) {
        await delay(100)
        let events = await this.getEvents()

        const existingIndex = events.findIndex(
            e => e.slotId === slotId && e.date === date && e.userId === userId
        )

        if (existingIndex >= 0) {
            events.splice(existingIndex, 1)
        } else {
            events.push({ slotId, date, userId, tableNumber: null })
        }

        if (this.useLocalStorage) {
            localStorage.setItem(STORAGE_KEY_EVENTS, JSON.stringify(events))
        }
        return events
    }

    // Admin: Delete any event by ID or criteria
    async adminDeleteEvent(slotId, date, userId) {
        await delay(100)
        let events = await this.getEvents()

        const beforeCount = events.length
        events = events.filter(e => !(e.slotId === slotId && e.date === date && e.userId === userId))

        if (this.useLocalStorage) {
            localStorage.setItem(STORAGE_KEY_EVENTS, JSON.stringify(events))
        }
        return { deleted: beforeCount - events.length, events }
    }
}

export const storageService = new StorageService()
