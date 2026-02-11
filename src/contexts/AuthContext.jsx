import React, { createContext, useState, useContext, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { storageService } from '../services/storage'
import {
    derivePermissions,
    getSimulatableRoles as getSimulatableRolesUtil,
} from '../utils/permissions'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)
    const [authError, setAuthError] = useState(null)
    const [memberStatus, setMemberStatus] = useState('none')
    const [mustChangePassword, setMustChangePassword] = useState(false)
    const [simulatedRole, setSimulatedRole] = useState(null) // Rôle simulé (null = pas de simulation)

    const checkMemberStatus = useCallback(async (userId) => {
        try {
            // Récupérer le profil complet (inclut licenseType, name et mustChangePassword)
            const profile = await storageService.getMemberProfile(userId)
            const status = profile?.status || 'none'
            const role = profile?.role || 'member'
            const licenseType = profile?.licenseType || null
            const name = profile?.name || null // Nom depuis la table members
            const needsPasswordChange = profile?.mustChangePassword || false

            setMemberStatus(status)
            setMustChangePassword(needsPasswordChange)
            return { status, role, licenseType, name, mustChangePassword: needsPasswordChange }
        } catch (error) {
            console.error('Error checking member status:', error)
            setMemberStatus('none')
            setMustChangePassword(false)
            return {
                status: 'none',
                role: 'member',
                licenseType: null,
                name: null,
                mustChangePassword: false,
            }
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
                    name:
                        session.user.user_metadata?.name ||
                        session.user.email?.split('@')[0] ||
                        'Joueur',
                    isSuperAdmin: false,
                    isAdmin: false,
                    isAdminSalles: false,
                    role: 'member',
                    licenseType: null,
                }

                if (!isMounted) return
                setUser(userData)

                // Vérifier le statut membre si demandé (AVANT de mettre loading à false)
                if (shouldCheckMember) {
                    const { role, licenseType, name } = await checkMemberStatus(userData.id)
                    if (!isMounted) return
                    setUser((prev) =>
                        prev
                            ? {
                                  ...prev,
                                  name: name || prev.name,
                                  role: role,
                                  ...derivePermissions(role),
                                  licenseType: licenseType,
                              }
                            : null
                    )
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
        supabase.auth
            .getSession()
            .then(({ data: { session } }) => {
                handleSession(session, true)
            })
            .catch((err) => {
                console.error('Session error:', err)
                if (isMounted) setLoading(false)
            })

        // 2. Écouter les changements ultérieurs
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN') {
                handleSession(session, true)
            } else if (event === 'SIGNED_OUT') {
                handleSession(null)
            } else if (event === 'TOKEN_REFRESHED') {
                // Session rafraîchie, pas besoin de re-vérifier le membre
                handleSession(session, false)
            }
            // Ignorer INITIAL_SESSION car on utilise getSession()
        })

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
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'members',
                    filter: `user_id=eq.${user.id}`,
                },
                async (payload) => {
                    // Le profil a été modifié (possiblement par un admin)
                    const newData = payload.new
                    setUser((prev) =>
                        prev
                            ? {
                                  ...prev,
                                  name: newData.name || prev.name,
                                  role: newData.role || prev.role,
                                  licenseType: newData.license_type || prev.licenseType,
                                  ...derivePermissions(newData.role || prev.role),
                              }
                            : null
                    )
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(memberSubscription)
        }
    }, [user?.id])

    // Inscription avec mot de passe
    const signUp = async (email, password, name) => {
        setAuthError(null)
        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: { name },
                    emailRedirectTo: window.location.origin,
                },
            })
            if (error) throw error
            return { success: true, data }
        } catch (error) {
            console.error('Signup error:', error)
            setAuthError(error.message)
            return { success: false, error: error.message }
        }
    }

    // Connexion avec mot de passe
    const signIn = async (email, password) => {
        setAuthError(null)
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            })
            if (error) throw error
            return { success: true, data }
        } catch (error) {
            console.error('Sign in error:', error)
            setAuthError(error.message)
            return { success: false, error: error.message }
        }
    }

    // Réinitialisation du mot de passe (envoi email)
    const resetPassword = async (email) => {
        setAuthError(null)
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`,
            })
            if (error) throw error
            return { success: true }
        } catch (error) {
            console.error('Reset password error:', error)
            setAuthError(error.message)
            return { success: false, error: error.message }
        }
    }

    // Changement de mot de passe (utilisateur connecté)
    const changePassword = async (newPassword) => {
        setAuthError(null)
        try {
            const { error } = await supabase.auth.updateUser({
                password: newPassword,
            })
            if (error) throw error
            // Après changement réussi, marquer comme n'ayant plus besoin de changer
            if (user?.id) {
                await storageService.clearMustChangePassword(user.id)
                setMustChangePassword(false)
            }
            return { success: true }
        } catch (error) {
            console.error('Change password error:', error)
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
                data: { name },
            })
            if (error) return { success: false, error: error.message }
            setUser((prev) => ({ ...prev, name }))
            return { success: true }
        } catch (error) {
            console.error('Update name error:', error)
            return { success: false, error: error.message }
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
            setUser((prev) =>
                prev
                    ? {
                          ...prev,
                          name: name || prev.name,
                          role: role,
                          ...derivePermissions(role),
                          licenseType: licenseType,
                      }
                    : null
            )
        }
    }

    // Obtenir les rôles qu'on peut simuler
    const getSimulatableRoles = useCallback(() => {
        return getSimulatableRolesUtil(user?.role || 'member')
    }, [user?.role])

    // User enrichi avec les permissions effectives (mémorisé)
    const effectiveUser = useMemo(() => {
        if (!user) return null
        const effectiveRole = simulatedRole || user.role || 'member'
        const perms = derivePermissions(effectiveRole)
        return {
            ...user,
            realRole: user.role,
            role: effectiveRole,
            isSuperAdmin: perms.isSuperAdmin,
            isAdmin: perms.isAdmin,
            isAdminSalles: perms.isAdminSalles,
        }
    }, [user, simulatedRole])

    // Mémoiser la valeur du contexte pour éviter les re-renders inutiles
    const contextValue = useMemo(
        () => ({
            user: effectiveUser,
            loading,
            authError,
            memberStatus,
            mustChangePassword,
            signUp,
            signIn,
            resetPassword,
            changePassword,
            requestAccess,
            updateName,
            logout,
            refreshMemberStatus,
            simulatedRole,
            setSimulatedRole,
            getSimulatableRoles,
        }),
        [
            effectiveUser,
            loading,
            authError,
            memberStatus,
            mustChangePassword,
            simulatedRole,
            getSimulatableRoles,
        ]
    )

    return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
