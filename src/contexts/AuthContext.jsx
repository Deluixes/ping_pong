import React, { createContext, useState, useContext, useEffect, useCallback } from 'react'
import { supabase, ADMIN_EMAILS } from '../lib/supabase'
import { storageService } from '../services/storage'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)
    const [authError, setAuthError] = useState(null)
    const [memberStatus, setMemberStatus] = useState('none')

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

            setMemberStatus(status)
            return { status, role }
        } catch (error) {
            console.error('Error checking member status:', error)
            setMemberStatus('none')
            return { status: 'none', role: 'member' }
        }
    }, [])

    useEffect(() => {
        let isMounted = true

        // Fonction pour traiter la session
        const handleSession = async (session, shouldCheckMember = false) => {
            if (!isMounted) return

            if (session?.user) {
                const userData = {
                    id: session.user.id,
                    email: session.user.email,
                    name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Joueur',
                    isAdminEmail: ADMIN_EMAILS.includes(session.user.email?.toLowerCase()),
                    isAdmin: false
                }
                setUser(userData)
                setLoading(false)

                // Vérifier le statut membre si demandé
                if (shouldCheckMember) {
                    const { role } = await checkMemberStatus(userData.id, userData.isAdminEmail, userData.email, userData.name)
                    if (isMounted) {
                        setUser(prev => prev ? ({ ...prev, isAdmin: role === 'admin' }) : null)
                    }
                }
            } else {
                setUser(null)
                setMemberStatus('none')
                setLoading(false)
            }
        }

        // 1. Récupérer la session initiale explicitement (plus fiable que INITIAL_SESSION)
        supabase.auth.getSession().then(({ data: { session } }) => {
            handleSession(session, true)
        })

        // 2. Écouter les changements ultérieurs
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (event === 'SIGNED_IN') {
                    handleSession(session, true)
                } else if (event === 'SIGNED_OUT') {
                    handleSession(null)
                } else if (event === 'TOKEN_REFRESHED') {
                    // Session rafraîchie, pas besoin de re-vérifier le membre
                    handleSession(session, false)
                }
                // Ignorer INITIAL_SESSION car on utilise getSession()
            }
        )

        return () => {
            isMounted = false
            subscription.unsubscribe()
        }
    }, [])

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
        setUser(null)
        await supabase.auth.signOut()
    }

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
