/**
 * Storage Service
 * Handles data persistence using localStorage.
 */

const STORAGE_KEY_USERS = 'pingpong_users'
const STORAGE_KEY_EVENTS = 'pingpong_events'
const STORAGE_KEY_MEMBERS = 'pingpong_members' // { pending: [], approved: [] }

export const GROUP_NAME = 'Ping-Pong Ramonville'

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

    async registerForSlot(slotId, date, userId, userName, tableNumber = null, duration = 1, guests = []) {
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

        // Add new registration with guests included
        events.push({ slotId, date, userId, userName, tableNumber, duration, guests })

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

    // Update user name in all their existing reservations
    async updateUserNameInEvents(userId, newName) {
        await delay(100)
        let events = await this.getEvents()
        let updated = 0

        events = events.map(e => {
            if (e.userId === userId) {
                updated++
                return { ...e, userName: newName }
            }
            return e
        })

        if (this.useLocalStorage) {
            localStorage.setItem(STORAGE_KEY_EVENTS, JSON.stringify(events))
        }
        return { updated, events }
    }

    // Get pending count for badge
    async getPendingCount() {
        const members = await this.getMembers()
        return members.pending.length
    }

    // === MEMBERSHIP MANAGEMENT ===

    async getMembers() {
        await delay(100)
        if (this.useLocalStorage) {
            const data = localStorage.getItem(STORAGE_KEY_MEMBERS)
            return data ? JSON.parse(data) : { pending: [], approved: [] }
        }
        return { pending: [], approved: [] }
    }

    async saveMembers(members) {
        await delay(100)
        if (this.useLocalStorage) {
            localStorage.setItem(STORAGE_KEY_MEMBERS, JSON.stringify(members))
        }
        return members
    }

    async requestAccess(userId, email, name) {
        const members = await this.getMembers()

        // Check if already a member
        if (members.approved.some(m => m.userId === userId)) {
            return { status: 'approved' }
        }
        if (members.pending.some(m => m.userId === userId)) {
            return { status: 'pending' }
        }

        // Add to pending
        members.pending.push({
            userId,
            email,
            name,
            requestedAt: new Date().toISOString()
        })
        await this.saveMembers(members)
        return { status: 'pending' }
    }

    async getMemberStatus(userId) {
        const members = await this.getMembers()
        if (members.approved.some(m => m.userId === userId)) {
            return 'approved'
        }
        if (members.pending.some(m => m.userId === userId)) {
            return 'pending'
        }
        return 'none'
    }

    async approveMember(userId) {
        const members = await this.getMembers()
        const pendingIndex = members.pending.findIndex(m => m.userId === userId)

        if (pendingIndex >= 0) {
            const member = members.pending[pendingIndex]
            members.pending.splice(pendingIndex, 1)
            members.approved.push({
                ...member,
                approvedAt: new Date().toISOString()
            })
            await this.saveMembers(members)
            return { success: true }
        }
        return { success: false }
    }

    async rejectMember(userId) {
        const members = await this.getMembers()
        members.pending = members.pending.filter(m => m.userId !== userId)
        await this.saveMembers(members)
        return { success: true }
    }

    async removeMember(userId) {
        const members = await this.getMembers()
        members.approved = members.approved.filter(m => m.userId !== userId)
        await this.saveMembers(members)
        return { success: true }
    }
}

export const storageService = new StorageService()

