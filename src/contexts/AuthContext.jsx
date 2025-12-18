import React, { createContext, useState, useContext, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { storageService } from '../services/storage'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)
    const [authError, setAuthError] = useState(null)
    const [memberStatus, setMemberStatus] = useState('none')
    const [simulatedRole, setSimulatedRole] = useState(null) // Rôle simulé (null = pas de simulation)

    const checkMemberStatus = useCallback(async (userId) => {
        try {
            // Récupérer le profil complet (inclut licenseType et name)
            const profile = await storageService.getMemberProfile(userId)
            const status = profile?.status || 'none'
            const role = profile?.role || 'member'
            const licenseType = profile?.licenseType || null
            const name = profile?.name || null // Nom depuis la table members

            setMemberStatus(status)
            return { status, role, licenseType, name }
        } catch (error) {
            console.error('Error checking member status:', error)
            setMemberStatus('none')
            return { status: 'none', role: 'member', licenseType: null, name: null }
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
                    isSuperAdmin: false,
                    isAdmin: false,
                    isAdminSalles: false,
                    role: 'member',
                    licenseType: null
                }

                if (!isMounted) return
                setUser(userData)

                // Vérifier le statut membre si demandé (AVANT de mettre loading à false)
                if (shouldCheckMember) {
                    const { role, licenseType, name } = await checkMemberStatus(userData.id)
                    if (!isMounted) return
                    setUser(prev => prev ? ({
                        ...prev,
                        // Utiliser le nom depuis la table members s'il existe (peut être modifié par admin)
                        name: name || prev.name,
                        role: role,
                        isSuperAdmin: role === 'super_admin',
                        isAdmin: role === 'admin' || role === 'super_admin',
                        isAdminSalles: role === 'admin' || role === 'admin_salles' || role === 'super_admin',
                        licenseType: licenseType
                    }) : null)
                }

                if (!isMounted) return
                setLoading(false)
            } else {
                if (!isMounted) return
                setUser(null)
                setMemberStatus('none')
                setLoading(false)
            }
        }

        // Timeout de sécurité - si auth prend plus de 10s, débloquer
        const timeoutId = setTimeout(() => {
            if (isMounted) {
                console.warn('Auth timeout - forcing loading to false')
                setLoading(false)
            }
        }, 10000)

        // 1. Récupérer la session initiale explicitement (plus fiable que INITIAL_SESSION)
        supabase.auth.getSession().then(({ data: { session } }) => {
            handleSession(session, true)
        }).catch(err => {
            console.error('Session error:', err)
            if (isMounted) setLoading(false)
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
            clearTimeout(timeoutId)
            subscription.unsubscribe()
        }
    }, [])

    // Subscription pour détecter les changements sur le profil de l'utilisateur connecté
    useEffect(() => {
        if (!user?.id) return

        const memberSubscription = supabase
            .channel('my-member-changes')
            .on('postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'members', filter: `user_id=eq.${user.id}` },
                async (payload) => {
                    // Le profil a été modifié (possiblement par un admin)
                    const newData = payload.new
                    setUser(prev => prev ? ({
                        ...prev,
                        name: newData.name || prev.name,
                        role: newData.role || prev.role,
                        licenseType: newData.license_type || prev.licenseType,
                        isSuperAdmin: newData.role === 'super_admin',
                        isAdmin: newData.role === 'admin' || newData.role === 'super_admin',
                        isAdminSalles: newData.role === 'admin' || newData.role === 'admin_salles' || newData.role === 'super_admin'
                    }) : null)
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(memberSubscription)
        }
    }, [user?.id])

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

    // Refresh member status (useful after admin approval or name change)
    const refreshMemberStatus = async () => {
        if (user) {
            const { role, licenseType, name } = await checkMemberStatus(user.id)
            // Update user role, license and name in state
            setUser(prev => prev ? ({
                ...prev,
                name: name || prev.name,
                role: role,
                isSuperAdmin: role === 'super_admin',
                isAdmin: role === 'admin' || role === 'super_admin',
                isAdminSalles: role === 'admin' || role === 'admin_salles' || role === 'super_admin',
                licenseType: licenseType
            }) : null)
        }
    }

    // Calcul des permissions effectives (prend en compte le rôle simulé)
    const getEffectivePermissions = () => {
        const effectiveRole = simulatedRole || user?.role || 'member'
        return {
            effectiveRole,
            isSuperAdmin: effectiveRole === 'super_admin',
            isAdmin: effectiveRole === 'admin' || effectiveRole === 'super_admin',
            isAdminSalles: effectiveRole === 'admin' || effectiveRole === 'admin_salles' || effectiveRole === 'super_admin'
        }
    }

    // Obtenir les rôles qu'on peut simuler
    const getSimulatableRoles = () => {
        const realRole = user?.role || 'member'
        const roles = []

        if (realRole === 'super_admin') {
            roles.push({ value: 'admin', label: 'Admin' })
            roles.push({ value: 'admin_salles', label: 'Gestion Salle' })
            roles.push({ value: 'member', label: 'Membre' })
        } else if (realRole === 'admin') {
            roles.push({ value: 'admin_salles', label: 'Gestion Salle' })
            roles.push({ value: 'member', label: 'Membre' })
        } else if (realRole === 'admin_salles') {
            roles.push({ value: 'member', label: 'Membre' })
        }

        return roles
    }

    const effectivePermissions = getEffectivePermissions()

    // User enrichi avec les permissions effectives
    const effectiveUser = user ? {
        ...user,
        // Garder le vrai rôle accessible
        realRole: user.role,
        // Remplacer par le rôle effectif (simulé ou réel)
        role: effectivePermissions.effectiveRole,
        isSuperAdmin: effectivePermissions.isSuperAdmin,
        isAdmin: effectivePermissions.isAdmin,
        isAdminSalles: effectivePermissions.isAdminSalles
    } : null

    return (
        <AuthContext.Provider value={{
            user: effectiveUser,
            loading,
            authError,
            memberStatus,
            sendMagicLink,
            requestAccess,
            updateName,
            logout,
            refreshMemberStatus,
            // Simulation de rôle
            simulatedRole,
            setSimulatedRole,
            getSimulatableRoles
        }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => useContext(AuthContext)
