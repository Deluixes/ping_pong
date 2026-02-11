import { supabase } from '../lib/supabase'

export const reservationService = {
    async getEvents(startDate, endDate) {
        let query = supabase.from('reservations').select('*').order('date', { ascending: true })

        if (startDate) query = query.gte('date', startDate)
        if (endDate) query = query.lte('date', endDate)

        const { data, error } = await query

        if (error) {
            console.error('Error fetching reservations:', error)
            return []
        }

        return data.map((r) => ({
            slotId: r.slot_id,
            date: r.date,
            userId: r.user_id,
            userName: r.user_name,
            duration: r.duration,
            overbooked: r.overbooked || false,
        }))
    },

    async registerForSlot(slotId, date, userId, userName, duration = 1, overbooked = false) {
        const { error } = await supabase.from('reservations').insert({
            slot_id: slotId,
            date: date,
            user_id: userId,
            user_name: userName,
            duration: duration,
            overbooked: overbooked,
        })

        if (error && error.code !== '23505') {
            console.error('Error registering for slot:', error)
        }

        return { success: !error || error.code === '23505' }
    },

    async unregisterFromSlot(slotId, date, userId) {
        const { error } = await supabase
            .from('reservations')
            .delete()
            .eq('slot_id', slotId)
            .eq('date', date)
            .eq('user_id', userId)

        if (error) {
            console.error('Error unregistering from slot:', error)
            return { success: false }
        }

        return { success: true }
    },

    async deleteReservationsForSlot(date, slotId) {
        const { data, error } = await supabase
            .from('reservations')
            .delete()
            .eq('date', date)
            .eq('slot_id', slotId)
            .select()

        if (error) {
            console.error('Error deleting reservations:', error)
            return { success: false, deleted: 0 }
        }

        return { success: true, deleted: data?.length || 0 }
    },

    async updateUserNameInEvents(userId, newName) {
        const { data, error } = await supabase
            .from('reservations')
            .update({ user_name: newName })
            .eq('user_id', userId)
            .select()

        if (error) {
            console.error('Error updating user name:', error)
            return { success: false, updated: 0 }
        }

        return { success: true, updated: data?.length || 0 }
    },
}
