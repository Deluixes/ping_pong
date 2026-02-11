import React from 'react'
import styles from './ErrorBoundary.module.css'

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props)
        this.state = { hasError: false, error: null }
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error }
    }

    componentDidCatch(error, errorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo)
    }

    handleReload = () => {
        window.location.reload()
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null })
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className={styles.container}>
                    <div className={styles.card}>
                        <h2 className={styles.title}>Une erreur est survenue</h2>
                        <p className={styles.message}>
                            L'application a rencontré un problème inattendu.
                        </p>
                        <div className={styles.actions}>
                            <button onClick={this.handleReset} className={styles.retryBtn}>
                                Réessayer
                            </button>
                            <button onClick={this.handleReload} className={styles.reloadBtn}>
                                Recharger la page
                            </button>
                        </div>
                    </div>
                </div>
            )
        }

        return this.props.children
    }
}

export default ErrorBoundary
