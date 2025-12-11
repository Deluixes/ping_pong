/**
 * Storage Service - Supabase Database
 * Centralized data storage with real-time sync
 */

import { supabase } from '../lib/supabase'

export const GROUP_NAME = 'Ping-Pong Ramonville'

class StorageService {
    // ==================== RESERVATIONS ====================

    async getEvents() {
        const { data, error } = await supabase
            .from('reservations')
            .select('*')
            .order('date', { ascending: true })

        if (error) {
            console.error('Error fetching reservations:', error)
            return []
        }

        // Map to legacy format for compatibility
        return data.map(r => ({
            slotId: r.slot_id,
            date: r.date,
            userId: r.user_id,
            userName: r.user_name,
            duration: r.duration,
            guests: r.guests || [],
            overbooked: r.overbooked || false
        }))
    }

    async registerForSlot(slotId, date, userId, userName, duration = 1, guests = [], overbooked = false) {
        const { error } = await supabase
            .from('reservations')
            .insert({
                slot_id: slotId,
                date: date,
                user_id: userId,
                user_name: userName,
                duration: duration,
                guests: guests,
                overbooked: overbooked
            })

        if (error && error.code !== '23505') {
            // Ignore duplicate key errors (user already registered)
            console.error('Error registering for slot:', error)
        }

        // Don't re-fetch events here, let caller handle it
        return { success: !error || error.code === '23505' }
    }

    async unregisterFromSlot(slotId, date, userId) {
        // D'abord récupérer la réservation pour voir s'il y a des invités
        const { data: reservation } = await supabase
            .from('reservations')
            .select('guests')
            .eq('slot_id', slotId)
            .eq('date', date)
            .eq('user_id', userId)
            .single()

        const guests = reservation?.guests || []

        // Supprimer la réservation
        const { error } = await supabase
            .from('reservations')
            .delete()
            .eq('slot_id', slotId)
            .eq('date', date)
            .eq('user_id', userId)

        if (error) {
            console.error('Error unregistering from slot:', error)
        }

        // Si des invités existent, les transférer à une autre réservation du même créneau
        if (guests.length > 0) {
            const { data: otherReservations } = await supabase
                .from('reservations')
                .select('*')
                .eq('slot_id', slotId)
                .eq('date', date)
                .limit(1)

            if (otherReservations && otherReservations.length > 0) {
                // Transférer les invités à la première autre réservation trouvée
                const existingGuests = otherReservations[0].guests || []
                const mergedGuests = [...existingGuests, ...guests]

                await supabase
                    .from('reservations')
                    .update({ guests: mergedGuests })
                    .eq('slot_id', slotId)
                    .eq('date', date)
                    .eq('user_id', otherReservations[0].user_id)
            }
            // Si pas d'autre réservation, les invités sont perdus
        }

        return this.getEvents()
    }

    async adminDeleteEvent(slotId, date, userId) {
        const { error } = await supabase
            .from('reservations')
            .delete()
            .eq('slot_id', slotId)
            .eq('date', date)
            .eq('user_id', userId)

        if (error) {
            console.error('Error deleting event:', error)
            return { deleted: 0, events: await this.getEvents() }
        }

        return { deleted: 1, events: await this.getEvents() }
    }

    async updateUserNameInEvents(userId, newName) {
        const { data, error } = await supabase
            .from('reservations')
            .update({ user_name: newName })
            .eq('user_id', userId)
            .select()

        if (error) {
            console.error('Error updating user name:', error)
            return { updated: 0, events: await this.getEvents() }
        }

        return { updated: data?.length || 0, events: await this.getEvents() }
    }

    // ==================== MEMBERS ====================

    async getMembers() {
        const { data, error } = await supabase
            .from('members')
            .select('*')
            .order('requested_at', { ascending: true })

        if (error) {
            console.error('Error fetching members:', error)
            return { pending: [], approved: [] }
        }

        const pending = data
            .filter(m => m.status === 'pending')
            .map(m => ({
                userId: m.user_id,
                email: m.email,
                name: m.name,
                requestedAt: m.requested_at,
                // Pending members don't really have a role yet, but default is member
                role: 'member'
            }))

        const approved = data
            .filter(m => m.status === 'approved')
            .map(m => ({
                userId: m.user_id,
                email: m.email,
                name: m.name,
                requestedAt: m.requested_at,
                approvedAt: m.approved_at,
                role: m.role || 'member'
            }))

        return { pending, approved }
    }

    async getPendingCount() {
        const { count, error } = await supabase
            .from('members')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending')

        if (error) {
            console.error('Error counting pending:', error)
            return 0
        }

        return count || 0
    }

    async getMemberRole(userId) {
        const { data, error } = await supabase
            .from('members')
            .select('role')
            .eq('user_id', userId)
            .single()

        if (error || !data) {
            return 'member' // Default
        }

        return data.role || 'member'
    }

    async updateMemberRole(userId, role) {
        const { error } = await supabase
            .from('members')
            .update({ role })
            .eq('user_id', userId)

        if (error) {
            console.error('Error updating member role:', error)
            return { success: false }
        }

        return { success: true }
    }

    async getMemberStatus(userId) {
        const { data, error } = await supabase
            .from('members')
            .select('status, role')
            .eq('user_id', userId)
            .single()

        if (error || !data) {
            return { status: 'none', role: 'member' }
        }

        return { status: data.status, role: data.role || 'member' }
    }

    async requestAccess(userId, email, name, role = 'member') {
        // Check if already exists
        const { status } = await this.getMemberStatus(userId)
        if (status !== 'none') {
            return { status }
        }

        const { error } = await supabase
            .from('members')
            .insert({
                user_id: userId,
                email: email,
                name: name,
                status: 'pending',
                role: role
            })

        if (error) {
            console.error('Error requesting access:', error)
            // May already exist
            return { status: (await this.getMemberStatus(userId)).status }
        }

        return { status: 'pending' }
    }

    async approveMember(userId) {
        const { error } = await supabase
            .from('members')
            .update({
                status: 'approved',
                approved_at: new Date().toISOString()
            })
            .eq('user_id', userId)

        if (error) {
            console.error('Error approving member:', error)
            return { success: false }
        }

        return { success: true }
    }

    async rejectMember(userId) {
        const { error } = await supabase
            .from('members')
            .delete()
            .eq('user_id', userId)

        if (error) {
            console.error('Error rejecting member:', error)
            return { success: false }
        }

        return { success: true }
    }

    async removeMember(userId) {
        return this.rejectMember(userId)
    }

    // ==================== INVITATIONS ====================

    async getPendingInvitations(userId) {
        const { data, error } = await supabase
            .from('reservations')
            .select('*')

        if (error) return []

        // Filtrer côté client car JSONB contains ne supporte pas bien les sous-objets
        const invitations = []
        data.forEach(r => {
            const guests = r.guests || []
            const myInvite = guests.find(g => g.odId === userId && g.status === 'pending')
            if (myInvite) {
                invitations.push({
                    slotId: r.slot_id,
                    date: r.date,
                    reservationUserId: r.user_id,
                    reservationUserName: r.user_name
                })
            }
        })
        return invitations
    }

    async getPendingInvitationsCount(userId) {
        const invitations = await this.getPendingInvitations(userId)
        return invitations.length
    }

    async acceptInvitation(slotId, date, guestUserId) {
        // Récupérer toutes les réservations de ce créneau
        const { data } = await supabase
            .from('reservations')
            .select('*')
            .eq('slot_id', slotId)
            .eq('date', date)

        if (!data) return { success: false }

        // Trouver la réservation qui contient cet invité
        for (const reservation of data) {
            const guests = reservation.guests || []
            const guestIndex = guests.findIndex(g => g.odId === guestUserId && g.status === 'pending')

            if (guestIndex !== -1) {
                guests[guestIndex].status = 'accepted'

                const { error } = await supabase
                    .from('reservations')
                    .update({ guests })
                    .eq('slot_id', slotId)
                    .eq('date', date)
                    .eq('user_id', reservation.user_id)

                return { success: !error }
            }
        }
        return { success: false }
    }

    async declineInvitation(slotId, date, guestUserId) {
        // Récupérer toutes les réservations de ce créneau
        const { data } = await supabase
            .from('reservations')
            .select('*')
            .eq('slot_id', slotId)
            .eq('date', date)

        if (!data) return { success: false }

        for (const reservation of data) {
            const guests = reservation.guests || []
            const guestIndex = guests.findIndex(g => g.odId === guestUserId)

            if (guestIndex !== -1) {
                const updatedGuests = guests.filter(g => g.odId !== guestUserId)

                const { error } = await supabase
                    .from('reservations')
                    .update({ guests: updatedGuests })
                    .eq('slot_id', slotId)
                    .eq('date', date)
                    .eq('user_id', reservation.user_id)

                return { success: !error }
            }
        }
        return { success: false }
    }

    // Retirer un invité (accepté ou pending) d'un créneau
    async removeGuestFromSlot(slotId, date, guestUserId) {
        // Récupérer toutes les réservations de ce créneau
        const { data } = await supabase
            .from('reservations')
            .select('*')
            .eq('slot_id', slotId)
            .eq('date', date)

        if (!data) return { success: false }

        for (const reservation of data) {
            const guests = reservation.guests || []
            const guestIndex = guests.findIndex(g => g.odId === guestUserId)

            if (guestIndex !== -1) {
                const updatedGuests = guests.filter(g => g.odId !== guestUserId)

                const { error } = await supabase
                    .from('reservations')
                    .update({ guests: updatedGuests })
                    .eq('slot_id', slotId)
                    .eq('date', date)
                    .eq('user_id', reservation.user_id)

                return { success: !error }
            }
        }
        return { success: false }
    }

    // ==================== SETTINGS ====================

    async getSetting(key) {
        const { data, error } = await supabase
            .from('settings')
            .select('value')
            .eq('key', key)
            .single()

        if (error) {
            console.error('Error fetching setting:', error)
            return null
        }

        return data?.value
    }

    async updateSetting(key, value) {
        const { error } = await supabase
            .from('settings')
            .update({ value, updated_at: new Date().toISOString() })
            .eq('key', key)

        if (error) {
            console.error('Error updating setting:', error)
            return { success: false }
        }

        return { success: true }
    }

    // ==================== REAL-TIME SUBSCRIPTIONS ====================

    subscribeToReservations(callback) {
        return supabase
            .channel('reservations-changes')
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'reservations' },
                () => callback()
            )
            .subscribe()
    }

    subscribeToMembers(callback) {
        return supabase
            .channel('members-changes')
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'members' },
                () => callback()
            )
            .subscribe()
    }

    unsubscribe(subscription) {
        if (subscription) {
            supabase.removeChannel(subscription)
        }
    }
}

export const storageService = new StorageService()
