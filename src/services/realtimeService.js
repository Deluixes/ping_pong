import { supabase } from '../lib/supabase'

export const realtimeService = {
    subscribeToReservations(callback) {
        return supabase
            .channel('reservations-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'reservations' }, () =>
                callback()
            )
            .subscribe()
    },

    subscribeToMembers(callback) {
        return supabase
            .channel('members-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'members' }, () =>
                callback()
            )
            .subscribe()
    },

    subscribeToInvitations(callback) {
        return supabase
            .channel('invitations-changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'slot_invitations' },
                () => callback()
            )
            .subscribe()
    },

    subscribeToOpenedSlots(callback) {
        return supabase
            .channel('opened-slots-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'opened_slots' }, () =>
                callback()
            )
            .subscribe()
    },

    unsubscribe(subscription) {
        if (subscription) {
            supabase.removeChannel(subscription)
        }
    },
}
