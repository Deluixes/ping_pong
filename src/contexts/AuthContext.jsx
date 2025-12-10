import React, { createContext, useState, useContext, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { storageService } from '../services/storage'

const AuthContext = createContext(null)

// Admin emails that can approve members
const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean)

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)
    const [authError, setAuthError] = useState(null)
    const [memberStatus, setMemberStatus] = useState('none') // 'none' | 'pending' | 'approved'

    const checkMemberStatus = useCallback(async (userId, isAdmin, email, name) => {
        try {
            let status = await storageService.getMemberStatus(userId)

            // Auto-approve admins
            if (isAdmin && status !== 'approved') {
                await storageService.requestAccess(userId, email, name)
                await storageService.approveMember(userId)
                status = 'approved'
            }

            setMemberStatus(status)
            return status
        } catch (error) {
            console.error('Error checking member status:', error)
            // Default to 'none' on error so the app doesn't get stuck
            setMemberStatus('none')
            return 'none'
        }
    }, [])

    useEffect(() => {
        const checkSession = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession()
                if (session?.user) {
                    const userData = {
                        id: session.user.id,
                        email: session.user.email,
                        name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Joueur',
                        isAdmin: ADMIN_EMAILS.includes(session.user.email?.toLowerCase())
                    }
                    setUser(userData)
                    await checkMemberStatus(userData.id, userData.isAdmin, userData.email, userData.name)
                }
            } catch (error) {
                console.error('Session check error:', error)
            } finally {
                setLoading(false)
            }
        }

        checkSession()

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (session?.user) {
                    const userData = {
                        id: session.user.id,
                        email: session.user.email,
                        name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Joueur',
                        isAdmin: ADMIN_EMAILS.includes(session.user.email?.toLowerCase())
                    }
                    setUser(userData)
                    await checkMemberStatus(userData.id, userData.isAdmin, userData.email, userData.name)
                } else {
                    setUser(null)
                    setMemberStatus('none')
                }
                setLoading(false)
            }
        )

        return () => subscription.unsubscribe()
    }, [checkMemberStatus])

    const sendMagicLink = async (email, name) => {
        setAuthError(null)
        try {
            const { error } = await supabase.auth.signInWithOtp({
                email,
                options: {
                    data: { name },
                    emailRedirectTo: window.location.origin
                }
            })

            if (error) throw error
            return { success: true }
        } catch (error) {
            console.error('Magic link error:', error)
            setAuthError(error.message)
            return { success: false, error: error.message }
        }
    }

    const requestAccess = async () => {
        if (!user) return { success: false }
        const result = await storageService.requestAccess(user.id, user.email, user.name)
        setMemberStatus(result.status)
        return { success: true, status: result.status }
    }

    const updateName = async (name) => {
        try {
            const { error } = await supabase.auth.updateUser({
                data: { name }
            })
            if (!error) {
                setUser(prev => ({ ...prev, name }))
            }
        } catch (error) {
            console.error('Update name error:', error)
        }
    }

    const logout = async () => {
        await supabase.auth.signOut()
        setUser(null)
        setMemberStatus('none')
    }

    // Safety timeout to prevent infinite loading
    useEffect(() => {
        const timer = setTimeout(() => {
            setLoading(false)
        }, 5000)
        return () => clearTimeout(timer)
    }, [])

    // Refresh member status (useful after admin approval)
    const refreshMemberStatus = async () => {
        if (user) {
            await checkMemberStatus(user.id, user.isAdmin, user.email, user.name)
        }
    }

    return (
        <AuthContext.Provider value={{
            user,
            loading,
            authError,
            memberStatus,
            sendMagicLink,
            requestAccess,
            updateName,
            logout,
            refreshMemberStatus
        }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => useContext(AuthContext)
