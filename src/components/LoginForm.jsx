import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Lock, UserPlus, LogIn, Eye, EyeOff } from 'lucide-react'
import clsx from 'clsx'
import { validatePassword } from '../utils/validation'
import styles from './LoginForm.module.css'

export default function LoginForm({
    email,
    onEmailChange,
    isSubmitting,
    onIsSubmittingChange,
    error,
    authError,
    onSignupSuccess,
    onSetError,
    onGoToForgot,
}) {
    const { signIn, signUp } = useAuth()
    const [activeTab, setActiveTab] = useState('login')
    const [name, setName] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)

    const switchTab = (tab) => {
        setActiveTab(tab)
        onSetError(null)
        setPassword('')
        setConfirmPassword('')
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        onSetError(null)

        if (activeTab === 'signup') {
            if (!name.trim()) {
                onSetError('Veuillez entrer votre nom')
                return
            }
            const pwdError = validatePassword(password)
            if (pwdError) {
                onSetError(pwdError)
                return
            }
            if (password !== confirmPassword) {
                onSetError('Les mots de passe ne correspondent pas')
                return
            }
        }

        if (!email.trim()) {
            onSetError('Veuillez entrer votre email')
            return
        }
        if (!password) {
            onSetError('Veuillez entrer votre mot de passe')
            return
        }

        onIsSubmittingChange(true)

        if (activeTab === 'signup') {
            const result = await signUp(email, password, name)
            onIsSubmittingChange(false)

            if (result.success) {
                onSignupSuccess()
            } else if (
                result.error?.includes('already registered') ||
                result.error?.includes('User already registered')
            ) {
                onSetError("Cet email est déjà inscrit. Utilisez l'onglet Connexion.")
                setActiveTab('login')
            }
        } else {
            const result = await signIn(email, password)
            onIsSubmittingChange(false)

            if (!result.success) {
                if (result.error?.includes('Invalid login credentials')) {
                    onSetError('Email ou mot de passe incorrect')
                } else {
                    onSetError(result.error || 'Erreur de connexion')
                }
            }
        }
    }

    return (
        <>
            {/* Tabs */}
            <div className="tab-bar">
                <button
                    onClick={() => switchTab('login')}
                    className={clsx('tab-btn', activeTab === 'login' && 'tab-btn--active')}
                >
                    <LogIn size={16} />
                    Connexion
                </button>
                <button
                    onClick={() => switchTab('signup')}
                    className={clsx('tab-btn', activeTab === 'signup' && 'tab-btn--active')}
                >
                    <UserPlus size={16} />
                    Inscription
                </button>
            </div>

            <form onSubmit={handleSubmit}>
                {/* Name field (only for signup) */}
                {activeTab === 'signup' && (
                    <div className={styles.formGroup}>
                        <label className="form-label">Prénom Nom</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Jean Dupont"
                            className="form-input"
                        />
                    </div>
                )}

                {/* Email field */}
                <div className={styles.formGroup}>
                    <label className="form-label">Email</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => onEmailChange(e.target.value)}
                        placeholder="jean@example.com"
                        className="form-input"
                        required
                    />
                </div>

                {/* Password field */}
                <div className={styles.formGroup}>
                    <label className="form-label">Mot de passe</label>
                    <div className={styles.passwordWrapper}>
                        <input
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className={clsx('form-input', styles.passwordInput)}
                            required
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className={clsx('icon-btn', styles.eyeToggle)}
                        >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                </div>

                {/* Confirm password field (only for signup) */}
                {activeTab === 'signup' && (
                    <div className={styles.formGroup}>
                        <label className="form-label">Confirmer le mot de passe</label>
                        <input
                            type={showPassword ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="••••••••"
                            className="form-input"
                            required
                        />
                    </div>
                )}

                {/* Forgot password link (only for login) */}
                {activeTab === 'login' && (
                    <div className={styles.forgotPasswordRow}>
                        <button
                            type="button"
                            onClick={onGoToForgot}
                            className={styles.forgotPasswordLink}
                        >
                            Mot de passe oublié ?
                        </button>
                    </div>
                )}

                {/* Error message */}
                {(error || authError) && (
                    <div className={clsx('alert', 'alert--error', styles.alertBox)}>
                        {error || authError}
                    </div>
                )}

                <button
                    type="submit"
                    className={clsx('btn', 'btn-primary', styles.submitBtn)}
                    disabled={isSubmitting}
                >
                    <Lock size={18} />
                    {isSubmitting
                        ? 'Chargement...'
                        : activeTab === 'login'
                          ? 'Se connecter'
                          : 'Créer un compte'}
                </button>
            </form>

            {activeTab === 'signup' && (
                <p className={styles.signupHint}>
                    Le mot de passe doit contenir au moins 8 caractères.
                </p>
            )}
        </>
    )
}
