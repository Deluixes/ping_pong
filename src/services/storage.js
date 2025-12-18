/**
 * Storage Service - Supabase Database
 * Centralized data storage with real-time sync
 */

import { supabase } from '../lib/supabase'

export const GROUP_NAME = 'Ping-Pong Ramonville'

class StorageService {
    // ==================== UTILS ====================

    // Convertit une heure au format "HH:MM" ou "HH:MM:SS" en minutes
    _timeToMinutes(time) {
        const [hours, minutes] = time.split(':').map(Number)
        return hours * 60 + minutes
    }

    // Convertit un slot_id au format "H:MM" ou "HH:MM" en minutes
    _slotIdToMinutes(slotId) {
        const [hours, minutes] = slotId.split(':').map(Number)
        return hours * 60 + minutes
    }

    // Vérifie si deux créneaux se chevauchent (même jour + heures qui se superposent)
    _slotsOverlap(slot1, slot2) {
        // Comparer les jours (soit dayOfWeek soit date)
        const day1 = slot1.date || slot1.dayOfWeek
        const day2 = slot2.date || slot2.dayOfWeek
        if (day1 !== day2) return false

        // Comparer les heures : start1 < end2 AND start2 < end1
        const start1 = this._timeToMinutes(slot1.startTime || slot1.start_time)
        const end1 = this._timeToMinutes(slot1.endTime || slot1.end_time)
        const start2 = this._timeToMinutes(slot2.startTime || slot2.start_time)
        const end2 = this._timeToMinutes(slot2.endTime || slot2.end_time)

        return start1 < end2 && start2 < end1
    }

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
            overbooked: r.overbooked || false
        }))
    }

    async registerForSlot(slotId, date, userId, userName, duration = 1, overbooked = false) {
        const { error } = await supabase
            .from('reservations')
            .insert({
                slot_id: slotId,
                date: date,
                user_id: userId,
                user_name: userName,
                duration: duration,
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
        const { error } = await supabase
            .from('reservations')
            .delete()
            .eq('slot_id', slotId)
            .eq('date', date)
            .eq('user_id', userId)

        if (error) {
            console.error('Error unregistering from slot:', error)
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
                role: 'member',
                licenseType: m.license_type || null
            }))

        const approved = data
            .filter(m => m.status === 'approved')
            .map(m => ({
                userId: m.user_id,
                email: m.email,
                name: m.name,
                requestedAt: m.requested_at,
                approvedAt: m.approved_at,
                role: m.role || 'member',
                licenseType: m.license_type || null
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
    }

    async updateMemberName(userId, name) {
        const { error } = await supabase
            .from('members')
            .update({ name })
            .eq('user_id', userId)

        if (error) {
            console.error('Error updating member name:', error)
            return { success: false }
        }

        return { success: true }
    }

    async getMemberProfile(userId) {
        const { data, error } = await supabase
            .from('members')
            .select('user_id, email, name, status, role, license_type')
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
            licenseType: data.license_type || null
        }
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

    // ==================== INVITATIONS (table séparée slot_invitations) ====================

    async getSlotInvitations(slotId, date) {
        const { data, error } = await supabase
            .from('slot_invitations')
            .select('*')
            .eq('slot_id', slotId)
            .eq('date', date)

        if (error) return []
        return data.map(inv => ({
            odId: inv.user_id,
            name: inv.user_name,
            status: inv.status,
            invitedBy: inv.invited_by
        }))
    }

    async getAllInvitationsForDate(date) {
        const { data, error } = await supabase
            .from('slot_invitations')
            .select('*')
            .eq('date', date)

        if (error) return []
        return data.map(inv => ({
            slotId: inv.slot_id,
            odId: inv.user_id,
            name: inv.user_name,
            status: inv.status,
            invitedBy: inv.invited_by
        }))
    }

    async getPendingInvitations(userId) {
        const { data, error } = await supabase
            .from('slot_invitations')
            .select(`
                slot_id,
                date,
                invited_by,
                inviter:members!slot_invitations_invited_by_fkey(first_name, last_name)
            `)
            .eq('user_id', userId)
            .eq('status', 'pending')

        if (error) return []
        return data.map(inv => ({
            slotId: inv.slot_id,
            date: inv.date,
            invitedBy: inv.inviter ? `${inv.inviter.first_name} ${inv.inviter.last_name}` : null
        }))
    }

    async getPendingInvitationsCount(userId) {
        const { count, error } = await supabase
            .from('slot_invitations')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('status', 'pending')

        if (error) return 0
        return count || 0
    }

    async inviteToSlot(slotId, date, userId, userName, invitedBy) {
        const { error } = await supabase
            .from('slot_invitations')
            .insert({
                slot_id: slotId,
                date: date,
                user_id: userId,
                user_name: userName,
                status: 'pending',
                invited_by: invitedBy
            })

        return { success: !error || error.code === '23505' }
    }

    async acceptInvitation(slotId, date, userId) {
        const { error } = await supabase
            .from('slot_invitations')
            .update({ status: 'accepted' })
            .eq('slot_id', slotId)
            .eq('date', date)
            .eq('user_id', userId)

        return { success: !error }
    }

    async declineInvitation(slotId, date, userId) {
        const { error } = await supabase
            .from('slot_invitations')
            .delete()
            .eq('slot_id', slotId)
            .eq('date', date)
            .eq('user_id', userId)

        return { success: !error }
    }

    async removeGuestFromSlot(slotId, date, userId) {
        return this.declineInvitation(slotId, date, userId)
    }

    async adminDeleteInvitation(slotId, date, userId) {
        const { error } = await supabase
            .from('slot_invitations')
            .delete()
            .eq('slot_id', slotId)
            .eq('date', date)
            .eq('user_id', userId)

        return { success: !error }
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

    // ==================== BLOCKED SLOTS ====================

    async getBlockedSlots() {
        const { data, error } = await supabase
            .from('blocked_slots')
            .select('*')
            .order('day_of_week', { ascending: true })
            .order('start_time', { ascending: true })

        if (error) {
            console.error('Error fetching blocked slots:', error)
            return []
        }

        return data.map(s => ({
            id: s.id,
            dayOfWeek: s.day_of_week,
            startTime: s.start_time,
            endTime: s.end_time,
            group: s.group_name,
            coach: s.coach,
            name: s.name,
            enabled: s.enabled
        }))
    }

    async createBlockedSlot(slot) {
        const { data, error } = await supabase
            .from('blocked_slots')
            .insert({
                day_of_week: slot.dayOfWeek,
                start_time: slot.startTime,
                end_time: slot.endTime,
                group_name: slot.group || null,
                coach: slot.coach,
                name: slot.name,
                enabled: true
            })
            .select()
            .single()

        if (error) {
            console.error('Error creating blocked slot:', error)
            return { success: false, error }
        }
        return { success: true, slot: data }
    }

    async updateBlockedSlot(id, slot) {
        const { error } = await supabase
            .from('blocked_slots')
            .update({
                day_of_week: slot.dayOfWeek,
                start_time: slot.startTime,
                end_time: slot.endTime,
                group_name: slot.group || null,
                coach: slot.coach,
                name: slot.name
            })
            .eq('id', id)

        if (error) {
            console.error('Error updating blocked slot:', error)
            return { success: false }
        }
        return { success: true }
    }

    async toggleBlockedSlot(id, enabled) {
        const { error } = await supabase
            .from('blocked_slots')
            .update({ enabled })
            .eq('id', id)

        if (error) {
            console.error('Error toggling blocked slot:', error)
            return { success: false }
        }
        return { success: true }
    }

    async deleteBlockedSlot(id) {
        const { error } = await supabase
            .from('blocked_slots')
            .delete()
            .eq('id', id)

        if (error) {
            console.error('Error deleting blocked slot:', error)
            return { success: false }
        }
        return { success: true }
    }

    // ==================== OPENING HOURS ====================

    async getOpeningHours() {
        const { data, error } = await supabase
            .from('opening_hours')
            .select('*')
            .order('day_of_week', { ascending: true })
            .order('start_time', { ascending: true })

        if (error) {
            console.error('Error fetching opening hours:', error)
            return []
        }

        return data.map(h => ({
            id: h.id,
            dayOfWeek: h.day_of_week,
            startTime: h.start_time,
            endTime: h.end_time,
            enabled: h.enabled
        }))
    }

    async createOpeningHour(hour) {
        const { data, error } = await supabase
            .from('opening_hours')
            .insert({
                day_of_week: hour.dayOfWeek,
                start_time: hour.startTime,
                end_time: hour.endTime,
                enabled: true
            })
            .select()
            .single()

        if (error) {
            console.error('Error creating opening hour:', error)
            return { success: false, error }
        }
        return { success: true, hour: data }
    }

    async updateOpeningHour(id, hour) {
        const { error } = await supabase
            .from('opening_hours')
            .update({
                day_of_week: hour.dayOfWeek,
                start_time: hour.startTime,
                end_time: hour.endTime
            })
            .eq('id', id)

        if (error) {
            console.error('Error updating opening hour:', error)
            return { success: false }
        }
        return { success: true }
    }

    async toggleOpeningHour(id, enabled) {
        const { error } = await supabase
            .from('opening_hours')
            .update({ enabled })
            .eq('id', id)

        if (error) {
            console.error('Error toggling opening hour:', error)
            return { success: false }
        }
        return { success: true }
    }

    async deleteOpeningHour(id) {
        const { error } = await supabase
            .from('opening_hours')
            .delete()
            .eq('id', id)

        if (error) {
            console.error('Error deleting opening hour:', error)
            return { success: false }
        }
        return { success: true }
    }

    // ==================== WEEK TEMPLATES ====================

    async getTemplates() {
        const { data, error } = await supabase
            .from('week_templates')
            .select('*')
            .order('name', { ascending: true })

        if (error) {
            console.error('Error fetching templates:', error)
            return []
        }
        return data
    }

    async createTemplate(name) {
        const { data, error } = await supabase
            .from('week_templates')
            .insert({ name })
            .select()
            .single()

        if (error) {
            console.error('Error creating template:', error)
            return { success: false, error }
        }
        return { success: true, template: data }
    }

    async updateTemplate(id, name) {
        const { error } = await supabase
            .from('week_templates')
            .update({ name })
            .eq('id', id)

        if (error) {
            console.error('Error updating template:', error)
            return { success: false }
        }
        return { success: true }
    }

    async deleteTemplate(id) {
        const { error } = await supabase
            .from('week_templates')
            .delete()
            .eq('id', id)

        if (error) {
            console.error('Error deleting template:', error)
            return { success: false }
        }
        return { success: true }
    }

    async getTemplateSlots(templateId) {
        const { data, error } = await supabase
            .from('template_slots')
            .select('*')
            .eq('template_id', templateId)
            .order('day_of_week', { ascending: true })
            .order('start_time', { ascending: true })

        if (error) {
            console.error('Error fetching template slots:', error)
            return []
        }

        return data.map(s => ({
            id: s.id,
            templateId: s.template_id,
            dayOfWeek: s.day_of_week,
            startTime: s.start_time,
            endTime: s.end_time,
            name: s.name,
            coach: s.coach,
            group: s.group_name,
            isBlocking: s.is_blocking
        }))
    }

    async createTemplateSlot(templateId, slot) {
        const { data, error } = await supabase
            .from('template_slots')
            .insert({
                template_id: templateId,
                day_of_week: slot.dayOfWeek,
                start_time: slot.startTime,
                end_time: slot.endTime,
                name: slot.name,
                coach: slot.coach || null,
                group_name: slot.group || null,
                is_blocking: slot.isBlocking !== false
            })
            .select()
            .single()

        if (error) {
            console.error('Error creating template slot:', error)
            return { success: false, error }
        }
        return { success: true, slot: data }
    }

    async updateTemplateSlot(id, slot) {
        const { error } = await supabase
            .from('template_slots')
            .update({
                day_of_week: slot.dayOfWeek,
                start_time: slot.startTime,
                end_time: slot.endTime,
                name: slot.name,
                coach: slot.coach || null,
                group_name: slot.group || null,
                is_blocking: slot.isBlocking !== false
            })
            .eq('id', id)

        if (error) {
            console.error('Error updating template slot:', error)
            return { success: false }
        }
        return { success: true }
    }

    async deleteTemplateSlot(id) {
        const { error } = await supabase
            .from('template_slots')
            .delete()
            .eq('id', id)

        if (error) {
            console.error('Error deleting template slot:', error)
            return { success: false }
        }
        return { success: true }
    }

    async getTemplateHours(templateId) {
        const { data, error } = await supabase
            .from('template_hours')
            .select('*')
            .eq('template_id', templateId)
            .order('day_of_week', { ascending: true })
            .order('start_time', { ascending: true })

        if (error) {
            console.error('Error fetching template hours:', error)
            return []
        }

        return data.map(h => ({
            id: h.id,
            templateId: h.template_id,
            dayOfWeek: h.day_of_week,
            startTime: h.start_time,
            endTime: h.end_time
        }))
    }

    async createTemplateHour(templateId, hour) {
        const { data, error } = await supabase
            .from('template_hours')
            .insert({
                template_id: templateId,
                day_of_week: hour.dayOfWeek,
                start_time: hour.startTime,
                end_time: hour.endTime
            })
            .select()
            .single()

        if (error) {
            console.error('Error creating template hour:', error)
            return { success: false, error }
        }
        return { success: true, hour: data }
    }

    async updateTemplateHour(id, hour) {
        const { error } = await supabase
            .from('template_hours')
            .update({
                day_of_week: hour.dayOfWeek,
                start_time: hour.startTime,
                end_time: hour.endTime
            })
            .eq('id', id)

        if (error) {
            console.error('Error updating template hour:', error)
            return { success: false }
        }
        return { success: true }
    }

    async deleteTemplateHour(id) {
        const { error } = await supabase
            .from('template_hours')
            .delete()
            .eq('id', id)

        if (error) {
            console.error('Error deleting template hour:', error)
            return { success: false }
        }
        return { success: true }
    }

    // ==================== WEEK CONFIGS ====================

    async analyzeTemplateConflicts(templateId, weekStarts) {
        // Récupérer les données du template
        const [templateResult, templateSlots] = await Promise.all([
            supabase.from('week_templates').select('name').eq('id', templateId).single(),
            this.getTemplateSlots(templateId)
        ])

        if (!templateResult.data) {
            return { success: false, error: 'Template not found' }
        }

        const result = {
            templateName: templateResult.data.name,
            configuredWeeks: [], // Semaines déjà configurées
            conflicts: [] // Créneaux en conflit par semaine
        }

        for (const weekStart of weekStarts) {
            const existingConfig = await this.getWeekConfig(weekStart)

            if (existingConfig) {
                result.configuredWeeks.push({
                    weekStart,
                    templateName: existingConfig.templateName
                })

                // Calculer les dates de la semaine pour le nouveau template
                const weekStartDate = new Date(weekStart)
                const dates = []
                for (let i = 0; i < 7; i++) {
                    const d = new Date(weekStartDate)
                    d.setDate(d.getDate() + i)
                    dates.push(d.toISOString().split('T')[0])
                }

                // Convertir les slots du template en slots avec dates
                const newSlots = templateSlots.map(slot => {
                    const dateIndex = slot.dayOfWeek === 0 ? 6 : slot.dayOfWeek - 1
                    return {
                        date: dates[dateIndex],
                        startTime: slot.startTime,
                        endTime: slot.endTime,
                        name: slot.name,
                        dayOfWeek: slot.dayOfWeek
                    }
                })

                // Trouver les chevauchements
                const weekConflicts = []
                for (const newSlot of newSlots) {
                    for (const existingSlot of existingConfig.slots) {
                        if (this._slotsOverlap(newSlot, existingSlot)) {
                            weekConflicts.push({
                                weekStart,
                                newSlot: {
                                    date: newSlot.date,
                                    startTime: newSlot.startTime,
                                    endTime: newSlot.endTime,
                                    name: newSlot.name
                                },
                                existingSlot: {
                                    date: existingSlot.date,
                                    startTime: existingSlot.startTime,
                                    endTime: existingSlot.endTime,
                                    name: existingSlot.name
                                }
                            })
                            break // Un seul conflit par slot suffit
                        }
                    }
                }

                if (weekConflicts.length > 0) {
                    result.conflicts.push(...weekConflicts)
                }
            }
        }

        return {
            success: true,
            hasConfiguredWeeks: result.configuredWeeks.length > 0,
            ...result
        }
    }

    async getWeekConfig(weekStart) {
        // weekStart doit être au format 'YYYY-MM-DD' (lundi de la semaine)
        const { data: config, error } = await supabase
            .from('week_configs')
            .select('*')
            .eq('week_start', weekStart)
            .single()

        if (error && error.code !== 'PGRST116') {
            console.error('Error fetching week config:', error)
            return null
        }

        if (!config) return null

        // Charger les slots et hours associés
        const [slotsResult, hoursResult] = await Promise.all([
            supabase.from('week_slots').select('*').eq('week_config_id', config.id).order('date').order('start_time'),
            supabase.from('week_hours').select('*').eq('week_config_id', config.id).order('date').order('start_time')
        ])

        return {
            id: config.id,
            weekStart: config.week_start,
            templateName: config.template_name,
            slots: (slotsResult.data || []).map(s => ({
                id: s.id,
                date: s.date,
                startTime: s.start_time,
                endTime: s.end_time,
                name: s.name,
                coach: s.coach,
                group: s.group_name,
                isBlocking: s.is_blocking
            })),
            hours: (hoursResult.data || []).map(h => ({
                id: h.id,
                date: h.date,
                startTime: h.start_time,
                endTime: h.end_time
            }))
        }
    }

    async isWeekConfigured(weekStart) {
        const { data, error } = await supabase
            .from('week_configs')
            .select('id')
            .eq('week_start', weekStart)
            .single()

        if (error && error.code !== 'PGRST116') {
            console.error('Error checking week config:', error)
            return false
        }

        return !!data
    }

    async getConfiguredWeeks(startDate, endDate) {
        const { data, error } = await supabase
            .from('week_configs')
            .select('week_start, template_name')
            .gte('week_start', startDate)
            .lte('week_start', endDate)
            .order('week_start', { ascending: true })

        if (error) {
            console.error('Error fetching configured weeks:', error)
            return []
        }
        return data
    }

    async applyTemplateToWeeks(templateId, weekStarts, mode = 'overwrite') {
        // mode: 'overwrite' = remplacer complètement | 'merge' = fusionner (garder existants si conflit) | 'merge_keep_new' = fusionner (garder nouveaux si conflit)

        // 1. Récupérer les données du template
        const [templateResult, slotsResult, hoursResult] = await Promise.all([
            supabase.from('week_templates').select('name').eq('id', templateId).single(),
            this.getTemplateSlots(templateId),
            this.getTemplateHours(templateId)
        ])

        if (!templateResult.data) {
            return { success: false, error: 'Template not found' }
        }

        const templateName = templateResult.data.name
        const templateSlots = slotsResult
        const templateHours = hoursResult

        let totalDeleted = 0
        let skippedSlots = 0

        for (const weekStart of weekStarts) {
            // 2. Créer ou récupérer la week_config
            let configId
            const existing = await this.getWeekConfig(weekStart)
            let existingSlots = []
            let existingHours = []

            if (existing) {
                configId = existing.id
                existingSlots = existing.slots || []
                existingHours = existing.hours || []

                if (mode === 'overwrite') {
                    // Mode écraser : supprimer les anciens slots et hours
                    await Promise.all([
                        supabase.from('week_slots').delete().eq('week_config_id', existing.id),
                        supabase.from('week_hours').delete().eq('week_config_id', existing.id)
                    ])
                    existingSlots = []
                    existingHours = []
                    // Mettre à jour le nom du template
                    await supabase.from('week_configs').update({ template_name: templateName }).eq('id', configId)
                }
                // En mode merge, on garde les slots/hours existants et on n'ajoute que les non-conflictuels
            } else {
                const { data: newConfig, error } = await supabase
                    .from('week_configs')
                    .insert({ week_start: weekStart, template_name: templateName })
                    .select()
                    .single()

                if (error) {
                    console.error('Error creating week config:', error)
                    continue
                }
                configId = newConfig.id
            }

            // 3. Calculer les dates de la semaine (lundi à dimanche)
            const weekStartDate = new Date(weekStart)
            const dates = []
            for (let i = 0; i < 7; i++) {
                const d = new Date(weekStartDate)
                d.setDate(d.getDate() + i)
                dates.push(d.toISOString().split('T')[0])
            }

            // 4. Créer les nouveaux slots (en filtrant les conflits en mode merge)
            const newSlots = []
            for (const slot of templateSlots) {
                const dateIndex = slot.dayOfWeek === 0 ? 6 : slot.dayOfWeek - 1
                const newSlot = {
                    week_config_id: configId,
                    date: dates[dateIndex],
                    start_time: slot.startTime,
                    end_time: slot.endTime,
                    name: slot.name,
                    coach: slot.coach || null,
                    group_name: slot.group || null,
                    is_blocking: slot.isBlocking
                }

                // En mode merge, vérifier s'il y a un conflit avec un slot existant
                if (mode === 'merge' && existingSlots.length > 0) {
                    const hasConflict = existingSlots.some(existingSlot =>
                        this._slotsOverlap(
                            { date: newSlot.date, startTime: newSlot.start_time, endTime: newSlot.end_time },
                            existingSlot
                        )
                    )
                    if (hasConflict) {
                        skippedSlots++
                        continue // Ne pas ajouter ce slot
                    }
                }

                // En mode merge_keep_new, supprimer les slots existants en conflit
                if (mode === 'merge_keep_new' && existingSlots.length > 0) {
                    const conflictingSlots = existingSlots.filter(existingSlot =>
                        this._slotsOverlap(
                            { date: newSlot.date, startTime: newSlot.start_time, endTime: newSlot.end_time },
                            existingSlot
                        )
                    )
                    for (const conflictSlot of conflictingSlots) {
                        await supabase.from('week_slots').delete().eq('id', conflictSlot.id)
                    }
                }

                newSlots.push(newSlot)
            }

            if (newSlots.length > 0) {
                await supabase.from('week_slots').insert(newSlots)
            }

            // 5. Créer les nouvelles plages horaires (en filtrant les conflits en mode merge)
            const newHours = []
            for (const hour of templateHours) {
                const dateIndex = hour.dayOfWeek === 0 ? 6 : hour.dayOfWeek - 1
                const newHour = {
                    week_config_id: configId,
                    date: dates[dateIndex],
                    start_time: hour.startTime,
                    end_time: hour.endTime
                }

                // En mode merge, vérifier s'il y a un conflit avec une plage existante
                if (mode === 'merge' && existingHours.length > 0) {
                    const hasConflict = existingHours.some(existingHour =>
                        this._slotsOverlap(
                            { date: newHour.date, startTime: newHour.start_time, endTime: newHour.end_time },
                            existingHour
                        )
                    )
                    if (hasConflict) {
                        continue // Ne pas ajouter cette plage
                    }
                }

                // En mode merge_keep_new, supprimer les plages horaires existantes en conflit
                if (mode === 'merge_keep_new' && existingHours.length > 0) {
                    const conflictingHours = existingHours.filter(existingHour =>
                        this._slotsOverlap(
                            { date: newHour.date, startTime: newHour.start_time, endTime: newHour.end_time },
                            existingHour
                        )
                    )
                    for (const conflictHour of conflictingHours) {
                        await supabase.from('week_hours').delete().eq('id', conflictHour.id)
                    }
                }

                newHours.push(newHour)
            }

            if (newHours.length > 0) {
                await supabase.from('week_hours').insert(newHours)
            }

            // 6. Supprimer les réservations qui chevauchent les créneaux bloquants UNIQUEMENT
            const blockingSlots = newSlots.filter(s => s.is_blocking)
            for (const slot of blockingSlots) {
                const { data: dayReservations } = await supabase
                    .from('reservations')
                    .select('id, slot_id')
                    .eq('date', slot.date)

                if (dayReservations && dayReservations.length > 0) {
                    const slotStartMinutes = this._timeToMinutes(slot.start_time)
                    const slotEndMinutes = this._timeToMinutes(slot.end_time)

                    const conflicting = dayReservations.filter(r => {
                        const resMinutes = this._slotIdToMinutes(r.slot_id)
                        return resMinutes >= slotStartMinutes && resMinutes < slotEndMinutes
                    })

                    if (conflicting.length > 0) {
                        const ids = conflicting.map(r => r.id)
                        await supabase.from('reservations').delete().in('id', ids)
                        totalDeleted += conflicting.length
                    }
                }
            }
        }

        return { success: true, deletedReservations: totalDeleted, skippedSlots }
    }

    /**
     * Applique plusieurs templates aux semaines, dans l'ordre de priorité
     * Le premier template a la priorité la plus haute (ses créneaux sont gardés en cas de conflit)
     * @param {Array<string>} templateIds - IDs des templates dans l'ordre de priorité (premier = plus prioritaire)
     * @param {Array<string>} weekStarts - Dates de début des semaines
     * @returns {Promise<{success: boolean, deletedReservations: number, skippedSlots: number}>}
     */
    async applyMultipleTemplatesToWeeks(templateIds, weekStarts) {
        if (!templateIds || templateIds.length === 0) {
            return { success: false, error: 'No templates provided' }
        }

        let totalDeleted = 0
        let totalSkipped = 0

        // Appliquer le premier template en mode overwrite (efface tout)
        const firstResult = await this.applyTemplateToWeeks(templateIds[0], weekStarts, 'overwrite')
        if (!firstResult.success) {
            return firstResult
        }
        totalDeleted += firstResult.deletedReservations || 0

        // Appliquer les templates suivants en mode merge (garde les existants = priorité au premier)
        for (let i = 1; i < templateIds.length; i++) {
            const result = await this.applyTemplateToWeeks(templateIds[i], weekStarts, 'merge')
            if (!result.success) {
                return result
            }
            totalDeleted += result.deletedReservations || 0
            totalSkipped += result.skippedSlots || 0
        }

        return { success: true, deletedReservations: totalDeleted, skippedSlots: totalSkipped }
    }

    async deleteWeekSlot(id) {
        const { error } = await supabase
            .from('week_slots')
            .delete()
            .eq('id', id)

        if (error) {
            console.error('Error deleting week slot:', error)
            return { success: false }
        }
        return { success: true }
    }

    async addWeekSlot(weekConfigId, slot) {
        const { data, error } = await supabase
            .from('week_slots')
            .insert({
                week_config_id: weekConfigId,
                date: slot.date,
                start_time: slot.startTime,
                end_time: slot.endTime,
                name: slot.name,
                coach: slot.coach || null,
                group_name: slot.group || null,
                is_blocking: slot.isBlocking !== false
            })
            .select()
            .single()

        if (error) {
            console.error('Error adding week slot:', error)
            return { success: false, error }
        }
        return { success: true, slot: data }
    }

    async getWeekSlots(weekStart) {
        const config = await this.getWeekConfig(weekStart)
        if (!config) return []
        return config.slots
    }

    async getWeekHours(weekStart) {
        const config = await this.getWeekConfig(weekStart)
        if (!config) return []
        return config.hours
    }

    async deleteWeekConfig(weekStart) {
        const { error } = await supabase
            .from('week_configs')
            .delete()
            .eq('week_start', weekStart)

        if (error) {
            console.error('Error deleting week config:', error)
            return { success: false }
        }
        return { success: true }
    }

    // ==================== OPENED SLOTS ====================

    async getOpenedSlotsForDate(date) {
        const { data, error } = await supabase
            .from('opened_slots')
            .select('*')
            .eq('date', date)

        if (error) {
            console.error('Error fetching opened slots:', error)
            return []
        }

        return data.map(s => ({
            id: s.id,
            date: s.date,
            slotId: s.slot_id,
            openedBy: s.opened_by,
            target: s.target,
            createdAt: s.created_at
        }))
    }

    async openSlot(date, slotId, openedBy, target = 'all') {
        const { data, error } = await supabase
            .from('opened_slots')
            .insert({
                date: date,
                slot_id: slotId,
                opened_by: openedBy,
                target: target
            })
            .select()
            .single()

        if (error) {
            console.error('Error opening slot:', error)
            return { success: false, error }
        }

        return { success: true, slot: data }
    }

    async closeSlot(date, slotId) {
        const { error } = await supabase
            .from('opened_slots')
            .delete()
            .eq('date', date)
            .eq('slot_id', slotId)

        if (error) {
            console.error('Error closing slot:', error)
            return { success: false }
        }

        return { success: true }
    }

    async updateOpenedSlotTarget(id, target) {
        const { error } = await supabase
            .from('opened_slots')
            .update({ target })
            .eq('id', id)

        if (error) {
            console.error('Error updating opened slot target:', error)
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

    subscribeToInvitations(callback) {
        return supabase
            .channel('invitations-changes')
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'slot_invitations' },
                () => callback()
            )
            .subscribe()
    }

    subscribeToOpenedSlots(callback) {
        return supabase
            .channel('opened-slots-changes')
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'opened_slots' },
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
