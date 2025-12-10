import React, { createContext, useState, useContext, useEffect, useCallback } from 'react'
import { supabase, ADMIN_EMAILS } from '../lib/supabase'
import { storageService } from '../services/storage'

const AuthContext = createContext(null)

// Restore user from cache for instant display
const getCachedUser = () => {
    try {
        const cached = localStorage.getItem('pingpong_user')
        return cached ? JSON.parse(cached) : null
    } catch {
        return null
    }
}

export const AuthProvider = ({ children }) => {
    // Initialize from cache for instant display
    const [user, setUser] = useState(getCachedUser)
    const [loading, setLoading] = useState(() => !getCachedUser())
    const [sessionReady, setSessionReady] = useState(false) // True when Supabase session is confirmed
    const [authError, setAuthError] = useState(null)
    // Initialize from cache if available to speed up launch
    const [memberStatus, setMemberStatus] = useState(() => {
        return localStorage.getItem('pingpong_member_status') || 'none'
    })

    const checkMemberStatus = useCallback(async (userId, isAdminEmail, email, name) => {
        try {
            let { status, role } = await storageService.getMemberStatus(userId)

            // Auto-approve admins if they are in the ENV list
            if (isAdminEmail) {
                if (status !== 'approved') {
                    // Not a member yet? Create as admin
                    await storageService.requestAccess(userId, email, name, 'admin')
                    await storageService.approveMember(userId)
                    status = 'approved'
                    role = 'admin'
                } else if (role !== 'admin') {
                    // Already member but not admin? Upgrade
                    await storageService.updateMemberRole(userId, 'admin')
                    role = 'admin'
                }
            }

            // Cache the role too
            if (role === 'admin') localStorage.setItem('pingpong_is_admin', 'true')
            else localStorage.removeItem('pingpong_is_admin')

            setMemberStatus(status)
            return { status, role }
        } catch (error) {
            console.error('Error checking member status:', error)
            setMemberStatus('none')
            return { status: 'none', role: 'member' }
        }
    }, [])

    // Persist member status to cache
    useEffect(() => {
        localStorage.setItem('pingpong_member_status', memberStatus)
    }, [memberStatus])

    // Persist user to cache for instant reload
    useEffect(() => {
        if (user) {
            localStorage.setItem('pingpong_user', JSON.stringify(user))
        } else {
            localStorage.removeItem('pingpong_user')
        }
    }, [user])

    useEffect(() => {
        const cachedUser = getCachedUser()

        // Always validate session in background, but don't block UI if we have cache
        const validateSession = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession()

                if (session?.user) {
                    // Session is valid - update user data (might have changed)
                    const userData = {
                        id: session.user.id,
                        email: session.user.email,
                        name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Joueur',
                        isAdminEmail: ADMIN_EMAILS.includes(session.user.email?.toLowerCase()),
                        isAdmin: localStorage.getItem('pingpong_is_admin') === 'true'
                    }
                    setUser(userData)
                    setSessionReady(true)
                    setLoading(false)
                } else if (cachedUser) {
                    // Had cache but session expired - clear everything
                    localStorage.removeItem('pingpong_user')
                    localStorage.removeItem('pingpong_member_status')
                    localStorage.removeItem('pingpong_is_admin')
                    setUser(null)
                    setMemberStatus('none')
                    setSessionReady(false)
                    setLoading(false)
                } else {
                    // No cache, no session
                    setSessionReady(false)
                    setLoading(false)
                }
            } catch (error) {
                console.error('Session check error:', error)
                // On error, trust the cache if we have it
                setSessionReady(!!cachedUser)
                setLoading(false)
            }
        }

        validateSession()

        // Listen for auth changes (login/logout)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (event === 'SIGNED_IN' && session?.user) {
                    const userData = {
                        id: session.user.id,
                        email: session.user.email,
                        name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Joueur',
                        isAdminEmail: ADMIN_EMAILS.includes(session.user.email?.toLowerCase()),
                        isAdmin: localStorage.getItem('pingpong_is_admin') === 'true'
                    }
                    setUser(userData)
                    setSessionReady(true)
                    setLoading(false)

                    const { role } = await checkMemberStatus(userData.id, userData.isAdminEmail, userData.email, userData.name)
                    setUser(prev => prev ? ({ ...prev, isAdmin: role === 'admin' }) : null)
                } else if (event === 'SIGNED_OUT') {
                    localStorage.removeItem('pingpong_user')
                    localStorage.removeItem('pingpong_member_status')
                    localStorage.removeItem('pingpong_is_admin')
                    setUser(null)
                    setMemberStatus('none')
                    setSessionReady(false)
                    setLoading(false)
                }
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
        // Default role is member unless updated later
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
        // Clear user cache but keep memberStatus (user stays member even logged out)
        localStorage.removeItem('pingpong_user')
        localStorage.removeItem('pingpong_is_admin')
        setUser(null)
        await supabase.auth.signOut()
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
            const { role } = await checkMemberStatus(user.id, user.isAdminEmail, user.email, user.name)
            // Update user role in state if changed
            if ((role === 'admin') !== user.isAdmin) {
                setUser(prev => ({ ...prev, isAdmin: role === 'admin' }))
            }
        }
    }

    return (
        <AuthContext.Provider value={{
            user,
            loading,
            sessionReady,
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
