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
            .select('*')
            .eq('user_id', userId)
            .eq('status', 'pending')

        if (error) return []
        return data.map(inv => ({
            slotId: inv.slot_id,
            date: inv.date,
            invitedBy: inv.invited_by
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

    async applyTemplateToWeeks(templateId, weekStarts) {
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

        for (const weekStart of weekStarts) {
            // 2. Créer ou récupérer la week_config
            let configId
            const existing = await this.getWeekConfig(weekStart)

            if (existing) {
                // Supprimer les anciens slots et hours
                await Promise.all([
                    supabase.from('week_slots').delete().eq('week_config_id', existing.id),
                    supabase.from('week_hours').delete().eq('week_config_id', existing.id)
                ])
                configId = existing.id

                // Mettre à jour le nom du template
                await supabase.from('week_configs').update({ template_name: templateName }).eq('id', configId)
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

            // 4. Créer les nouveaux slots
            const newSlots = []
            for (const slot of templateSlots) {
                // dayOfWeek: 0=dimanche, 1=lundi, etc.
                // dates[0] = lundi, dates[6] = dimanche
                const dateIndex = slot.dayOfWeek === 0 ? 6 : slot.dayOfWeek - 1
                newSlots.push({
                    week_config_id: configId,
                    date: dates[dateIndex],
                    start_time: slot.startTime,
                    end_time: slot.endTime,
                    name: slot.name,
                    coach: slot.coach || null,
                    group_name: slot.group || null,
                    is_blocking: slot.isBlocking
                })
            }

            if (newSlots.length > 0) {
                await supabase.from('week_slots').insert(newSlots)
            }

            // 5. Créer les nouvelles plages horaires
            const newHours = []
            for (const hour of templateHours) {
                const dateIndex = hour.dayOfWeek === 0 ? 6 : hour.dayOfWeek - 1
                newHours.push({
                    week_config_id: configId,
                    date: dates[dateIndex],
                    start_time: hour.startTime,
                    end_time: hour.endTime
                })
            }

            if (newHours.length > 0) {
                await supabase.from('week_hours').insert(newHours)
            }

            // 6. Supprimer les réservations qui chevauchent les créneaux bloquants
            const blockingSlots = newSlots.filter(s => s.is_blocking)
            for (const slot of blockingSlots) {
                // Récupérer toutes les réservations de cette date
                const { data: dayReservations } = await supabase
                    .from('reservations')
                    .select('id, slot_id')
                    .eq('date', slot.date)

                if (dayReservations && dayReservations.length > 0) {
                    // Convertir les heures du slot en minutes pour comparaison
                    const slotStartMinutes = this._timeToMinutes(slot.start_time)
                    const slotEndMinutes = this._timeToMinutes(slot.end_time)

                    // Filtrer les réservations qui chevauchent le créneau bloquant
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

        return { success: true, deletedReservations: totalDeleted }
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

    unsubscribe(subscription) {
        if (subscription) {
            supabase.removeChannel(subscription)
        }
    }
}

export const storageService = new StorageService()
