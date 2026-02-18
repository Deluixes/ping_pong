import React from 'react'
import { useAuth } from '../contexts/AuthContext'
import { ArrowLeft } from 'lucide-react'
import clsx from 'clsx'
import styles from './ForgotPasswordForm.module.css'

export default function ForgotPasswordForm({
    email,
    onEmailChange,
    isSubmitting,
    onIsSubmittingChange,
    error,
    onSetError,
    successMessage,
    onSetSuccessMessage,
    authError,
    onBack,
}) {
    const { resetPassword } = useAuth()

    const handleForgotPassword = async (e) => {
        e.preventDefault()
        onSetError(null)
        onSetSuccessMessage(null)

        if (!email.trim()) {
            onSetError('Veuillez entrer votre email')
            return
        }

        onIsSubmittingChange(true)
        const result = await resetPassword(email)
        onIsSubmittingChange(false)

        if (result.success) {
            onSetSuccessMessage('Un email de réinitialisation a été envoyé à ' + email)
        }
    }

    return (
        <div>
            <h2 className={styles.forgotTitle}>Mot de passe oublié</h2>

            <p className={styles.forgotText}>
                Entrez votre email pour recevoir un lien de réinitialisation.
            </p>

            <form onSubmit={handleForgotPassword}>
                <div className={styles.formGroupLg}>
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

                {/* Error message */}
                {(error || authError) && (
                    <div className={clsx('alert', 'alert--error', styles.alertBox)}>
                        {error || authError}
                    </div>
                )}

                {/* Success message */}
                {successMessage && (
                    <div className={clsx('alert', 'alert--success', styles.alertBoxSuccess)}>
                        {successMessage}
                    </div>
                )}

                <button
                    type="submit"
                    className={clsx('btn', 'btn-primary', styles.forgotSubmitBtn)}
                    disabled={isSubmitting}
                >
                    {isSubmitting ? 'Envoi...' : 'Envoyer le lien'}
                </button>

                <button type="button" onClick={onBack} className={clsx('btn', styles.backBtn)}>
                    <ArrowLeft size={18} />
                    Retour à la connexion
                </button>
            </form>
        </div>
    )
}
