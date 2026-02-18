import { supabase } from '../lib/supabase'

let channelCounter = 0
function uniqueChannel(base) {
    return `${base}-${++channelCounter}`
}

export const realtimeService = {
    subscribeToReservations(callback) {
        return supabase
            .channel(uniqueChannel('reservations-changes'))
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'reservations' },
                (payload) => callback(payload)
            )
            .subscribe()
    },

    subscribeToMembers(callback) {
        return supabase
            .channel(uniqueChannel('members-changes'))
            .on('postgres_changes', { event: '*', schema: 'public', table: 'members' }, () =>
                callback()
            )
            .subscribe()
    },

    subscribeToInvitations(callback) {
        return supabase
            .channel(uniqueChannel('invitations-changes'))
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'slot_invitations' },
                (payload) => callback(payload)
            )
            .subscribe()
    },

    subscribeToOpenedSlots(callback) {
        return supabase
            .channel(uniqueChannel('opened-slots-changes'))
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'opened_slots' },
                (payload) => callback(payload)
            )
            .subscribe()
    },

    unsubscribe(subscription) {
        if (subscription) {
            supabase.removeChannel(subscription)
        }
    },
}
