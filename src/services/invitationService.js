import { supabase } from '../lib/supabase'

export function mapInvitationRow(r) {
    return {
        slotId: r.slot_id,
        date: r.date,
        userId: r.user_id,
        name: r.user_name,
        status: r.status,
        invitedBy: r.invited_by,
        duration: r.duration || 1,
        type: r.type || 'standard',
        originalSlotId: r.original_slot_id || null,
        originalDuration: r.original_duration || null,
    }
}

export const invitationService = {
    async getSlotInvitations(slotId, date) {
        const { data, error } = await supabase
            .from('slot_invitations')
            .select('*')
            .eq('slot_id', slotId)
            .eq('date', date)

        if (error) {
            console.error('Error fetching slot invitations:', error)
            return []
        }
        return data.map(mapInvitationRow)
    },

    async getAllInvitationsForDate(date) {
        const { data, error } = await supabase.from('slot_invitations').select('*').eq('date', date)

        if (error) {
            console.error('Error fetching invitations for date:', error)
            return []
        }
        return data.map(mapInvitationRow)
    },

    async getAllInvitationsForWeek(startDate, endDate) {
        const { data, error } = await supabase
            .from('slot_invitations')
            .select('*')
            .gte('date', startDate)
            .lte('date', endDate)

        if (error) {
            console.error('Error fetching invitations for week:', error)
            return []
        }
        return data.map(mapInvitationRow)
    },

    async getPendingInvitations(userId) {
        const { data, error } = await supabase
            .from('slot_invitations')
            .select(
                'slot_id, date, invited_by, duration, type, original_slot_id, original_duration'
            )
            .eq('user_id', userId)
            .eq('status', 'pending')

        if (error) {
            console.error('Error fetching pending invitations:', error)
            return []
        }

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
            invitedByUserId: inv.invited_by || null,
            duration: inv.duration || 1,
            type: inv.type || 'standard',
            originalSlotId: inv.original_slot_id || null,
            originalDuration: inv.original_duration || null,
        }))
    },

    async getPendingInvitationsCount(userId) {
        const { count, error } = await supabase
            .from('slot_invitations')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('status', 'pending')

        if (error) {
            console.error('Error fetching pending invitations count:', error)
            return 0
        }
        return count || 0
    },

    async inviteToSlot(slotId, date, userId, userName, invitedBy, duration = 1, options = {}) {
        const insertData = {
            slot_id: slotId,
            date: date,
            user_id: userId,
            user_name: userName,
            status: 'pending',
            invited_by: invitedBy,
            duration: duration,
        }
        if (options.type) insertData.type = options.type
        if (options.originalSlotId) insertData.original_slot_id = options.originalSlotId
        if (options.originalDuration) insertData.original_duration = options.originalDuration

        const { error } = await supabase.from('slot_invitations').insert(insertData)

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
