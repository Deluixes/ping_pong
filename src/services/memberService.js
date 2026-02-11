import { supabase } from '../lib/supabase'

export const memberService = {
    async getMembers(includeTEST = false) {
        const { data, error } = await supabase
            .from('members')
            .select('*')
            .order('requested_at', { ascending: true })

        if (error) {
            console.error('Error fetching members:', error)
            return { pending: [], approved: [] }
        }

        const filterTEST = (members) => {
            if (includeTEST) return members
            return members.filter((m) => !m.name?.startsWith('TEST_'))
        }

        const pending = data
            .filter((m) => m.status === 'pending')
            .map((m) => ({
                userId: m.user_id,
                email: m.email,
                name: m.name,
                requestedAt: m.requested_at,
                role: 'member',
                licenseType: m.license_type || null,
            }))

        const approved = data
            .filter((m) => m.status === 'approved')
            .map((m) => ({
                userId: m.user_id,
                email: m.email,
                name: m.name,
                requestedAt: m.requested_at,
                approvedAt: m.approved_at,
                role: m.role || 'member',
                licenseType: m.license_type || null,
            }))

        return { pending: filterTEST(pending), approved: filterTEST(approved) }
    },

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
    },

    async getMemberRole(userId) {
        const { data, error } = await supabase
            .from('members')
            .select('role')
            .eq('user_id', userId)
            .single()

        if (error || !data) {
            return 'member'
        }

        return data.role || 'member'
    },

    async updateMemberRole(userId, role) {
        const { error } = await supabase.from('members').update({ role }).eq('user_id', userId)

        if (error) {
            console.error('Error updating member role:', error)
            return { success: false }
        }

        return { success: true }
    },

    async updateMemberLicense(userId, licenseType) {
        const { error } = await supabase
            .from('members')
            .update({ license_type: licenseType })
            .eq('user_id', userId)

        if (error) {
            console.error('Error updating member license:', error)
            return { success: false }
        }

        return { success: true }
    },

    async updateMemberName(userId, name) {
        const { error } = await supabase.from('members').update({ name }).eq('user_id', userId)

        if (error) {
            console.error('Error updating member name:', error)
            return { success: false }
        }

        return { success: true }
    },

    async getMemberProfile(userId) {
        const { data, error } = await supabase
            .from('members')
            .select('user_id, email, name, status, role, license_type, must_change_password')
            .eq('user_id', userId)
            .single()

        if (error || !data) {
            return null
        }

        return {
            userId: data.user_id,
            email: data.email,
            name: data.name,
            status: data.status,
            role: data.role || 'member',
            licenseType: data.license_type || null,
            mustChangePassword: data.must_change_password || false,
        }
    },

    async getMustChangePassword(userId) {
        const { data, error } = await supabase
            .from('members')
            .select('must_change_password')
            .eq('user_id', userId)
            .single()

        if (error || !data) return false
        return data.must_change_password || false
    },

    async clearMustChangePassword(userId) {
        const { error } = await supabase
            .from('members')
            .update({ must_change_password: false })
            .eq('user_id', userId)

        if (error) {
            console.error('Error clearing must_change_password:', error)
            return { success: false }
        }
        return { success: true }
    },

    async getAllApprovedMembers(includeTEST = false) {
        const { data, error } = await supabase
            .from('members')
            .select('user_id, name, license_type, profile_photo_url')
            .eq('status', 'approved')
            .order('name', { ascending: true })

        if (error) {
            console.error('Error fetching approved members:', error)
            return []
        }

        let result = data.map((m) => ({
            userId: m.user_id,
            name: m.name,
            licenseType: m.license_type || null,
            profilePhotoUrl: m.profile_photo_url || null,
        }))

        if (!includeTEST) {
            result = result.filter((m) => !m.name?.startsWith('TEST_'))
        }

        return result
    },

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
    },

    async requestAccess(userId, email, name, role = 'member') {
        const { status } = await memberService.getMemberStatus(userId)
        if (status !== 'none') {
            return { status }
        }

        const { error } = await supabase.from('members').insert({
            user_id: userId,
            email: email,
            name: name,
            status: 'pending',
            role: role,
        })

        if (error) {
            console.error('Error requesting access:', error)
            return { status: (await memberService.getMemberStatus(userId)).status }
        }

        return { status: 'pending' }
    },

    async approveMember(userId) {
        const { error } = await supabase
            .from('members')
            .update({
                status: 'approved',
                approved_at: new Date().toISOString(),
            })
            .eq('user_id', userId)

        if (error) {
            console.error('Error approving member:', error)
            return { success: false }
        }

        return { success: true }
    },

    async rejectMember(userId) {
        const { error } = await supabase.from('members').delete().eq('user_id', userId)

        if (error) {
            console.error('Error rejecting member:', error)
            return { success: false }
        }

        return { success: true }
    },

    async removeMember(userId) {
        return memberService.rejectMember(userId)
    },
}
