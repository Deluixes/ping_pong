import React, { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Check, ArrowLeft } from 'lucide-react'
import clsx from 'clsx'
import LoginForm from './LoginForm'
import ForgotPasswordForm from './ForgotPasswordForm'
import styles from './Login.module.css'

export default function Login() {
    const [email, setEmail] = useState('')
    const [step, setStep] = useState('form') // 'form' | 'sent' | 'forgot'
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState(null)
    const [successMessage, setSuccessMessage] = useState(null)
    const { user, loading, authError } = useAuth()

    if (loading) {
        return <div className={styles.loading}>Chargement...</div>
    }

    if (user) {
        return <Navigate to="/" replace />
    }

    const resetForm = () => {
        setStep('form')
        setError(null)
        setSuccessMessage(null)
    }

    const goToForgotPassword = () => {
        setStep('forgot')
        setError(null)
        setSuccessMessage(null)
    }

    return (
        <div className={styles.container}>
            <div className={clsx('card', styles.cardWrapper)}>
                {step === 'form' && (
                    <>
                        {/* Logo */}
                        <div className={styles.logoSection}>
                            <svg width="56" height="56" viewBox="0 0 64 64" fill="none">
                                <circle cx="24" cy="24" r="20" fill="var(--color-primary)" />
                                <rect
                                    x="38"
                                    y="38"
                                    width="8"
                                    height="22"
                                    rx="4"
                                    fill="var(--color-secondary)"
                                    transform="rotate(-45 38 38)"
                                />
                                <circle
                                    cx="50"
                                    cy="14"
                                    r="6"
                                    fill="white"
                                    stroke="var(--color-secondary)"
                                    strokeWidth="2"
                                />
                            </svg>
                            <h1 className={styles.logoTitle}>Ping Pong Club</h1>
                        </div>

                        <LoginForm
                            email={email}
                            onEmailChange={setEmail}
                            isSubmitting={isSubmitting}
                            onIsSubmittingChange={setIsSubmitting}
                            error={error}
                            authError={authError}
                            onSignupSuccess={() => setStep('sent')}
                            onSetError={setError}
                            onGoToForgot={goToForgotPassword}
                        />
                    </>
                )}

                {step === 'sent' && (
                    <div className={styles.sentWrapper}>
                        <div className={styles.sentIcon}>
                            <Check size={40} color="#059669" />
                        </div>

                        <h2 className={styles.sentTitle}>Compte créé !</h2>

                        <p className={styles.sentText}>
                            Un email de confirmation a été envoyé à<br />
                            <strong className={styles.sentEmailHighlight}>{email}</strong>
                        </p>

                        <div className={styles.sentInfoBox}>
                            Vérifiez votre boîte mail (et les spams) pour confirmer votre
                            inscription.
                        </div>

                        <button onClick={resetForm} className={clsx('btn', styles.backBtn)}>
                            <ArrowLeft size={18} />
                            Retour à la connexion
                        </button>
                    </div>
                )}

                {step === 'forgot' && (
                    <ForgotPasswordForm
                        email={email}
                        onEmailChange={setEmail}
                        isSubmitting={isSubmitting}
                        onIsSubmittingChange={setIsSubmitting}
                        error={error}
                        onSetError={setError}
                        successMessage={successMessage}
                        onSetSuccessMessage={setSuccessMessage}
                        authError={authError}
                        onBack={resetForm}
                    />
                )}
            </div>
        </div>
    )
}
