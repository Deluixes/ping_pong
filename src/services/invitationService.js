import { supabase } from '../lib/supabase'

export const invitationService = {
    async getSlotInvitations(slotId, date) {
        const { data, error } = await supabase
            .from('slot_invitations')
            .select('*')
            .eq('slot_id', slotId)
            .eq('date', date)

        if (error) return []
        return data.map((inv) => ({
            userId: inv.user_id,
            name: inv.user_name,
            status: inv.status,
            invitedBy: inv.invited_by,
        }))
    },

    async getAllInvitationsForDate(date) {
        const { data, error } = await supabase.from('slot_invitations').select('*').eq('date', date)

        if (error) return []
        return data.map((inv) => ({
            slotId: inv.slot_id,
            userId: inv.user_id,
            name: inv.user_name,
            status: inv.status,
            invitedBy: inv.invited_by,
            duration: inv.duration || 1,
        }))
    },

    async getAllInvitationsForWeek(startDate, endDate) {
        const { data, error } = await supabase
            .from('slot_invitations')
            .select('*')
            .gte('date', startDate)
            .lte('date', endDate)

        if (error) return []
        return data.map((inv) => ({
            slotId: inv.slot_id,
            date: inv.date,
            userId: inv.user_id,
            name: inv.user_name,
            status: inv.status,
            invitedBy: inv.invited_by,
            duration: inv.duration || 1,
        }))
    },

    async getPendingInvitations(userId) {
        const { data, error } = await supabase
            .from('slot_invitations')
            .select('slot_id, date, invited_by, duration')
            .eq('user_id', userId)
            .eq('status', 'pending')

        if (error) return []

        const inviterIds = [...new Set(data.map((inv) => inv.invited_by).filter(Boolean))]
        let inviterNames = {}

        if (inviterIds.length > 0) {
            const { data: members } = await supabase
                .from('members')
                .select('user_id, name')
                .in('user_id', inviterIds)

            if (members) {
                members.forEach((m) => {
                    inviterNames[m.user_id] = m.name
                })
            }
        }

        return data.map((inv) => ({
            slotId: inv.slot_id,
            date: inv.date,
            invitedBy: inviterNames[inv.invited_by] || null,
            duration: inv.duration || 1,
        }))
    },

    async getPendingInvitationsCount(userId) {
        const { count, error } = await supabase
            .from('slot_invitations')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('status', 'pending')

        if (error) return 0
        return count || 0
    },

    async inviteToSlot(slotId, date, userId, userName, invitedBy, duration = 1) {
        const { error } = await supabase.from('slot_invitations').insert({
            slot_id: slotId,
            date: date,
            user_id: userId,
            user_name: userName,
            status: 'pending',
            invited_by: invitedBy,
            duration: duration,
        })

        return { success: !error || error.code === '23505' }
    },

    async acceptInvitation(slotId, date, userId, newSlotId, newDuration) {
        const updateData = { status: 'accepted' }
        if (newSlotId) updateData.slot_id = newSlotId
        if (newDuration) updateData.duration = newDuration

        const { error } = await supabase
            .from('slot_invitations')
            .update(updateData)
            .eq('slot_id', slotId)
            .eq('date', date)
            .eq('user_id', userId)

        return { success: !error }
    },

    async declineInvitation(slotId, date, userId) {
        const { error } = await supabase
            .from('slot_invitations')
            .delete()
            .eq('slot_id', slotId)
            .eq('date', date)
            .eq('user_id', userId)

        return { success: !error }
    },

    async removeGuestFromSlot(slotId, date, userId) {
        return invitationService.declineInvitation(slotId, date, userId)
    },

    async updateInvitation(slotId, date, userId, updates) {
        const { error } = await supabase
            .from('slot_invitations')
            .update(updates)
            .eq('slot_id', slotId)
            .eq('date', date)
            .eq('user_id', userId)

        return { success: !error }
    },

    async adminDeleteInvitation(slotId, date, userId) {
        const { error } = await supabase
            .from('slot_invitations')
            .delete()
            .eq('slot_id', slotId)
            .eq('date', date)
            .eq('user_id', userId)

        return { success: !error }
    },

    async updateUserNameInInvitations(userId, newName) {
        const { data, error } = await supabase
            .from('slot_invitations')
            .update({ user_name: newName })
            .eq('user_id', userId)
            .select()

        if (error) {
            console.error('Error updating user name in invitations:', error)
            return { success: false }
        }

        return { success: true, updated: data?.length || 0 }
    },
}
