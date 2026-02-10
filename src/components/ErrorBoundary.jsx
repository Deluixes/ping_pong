import React from 'react'

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
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: '100vh',
                        padding: '2rem',
                        textAlign: 'center',
                        background: 'var(--color-bg, #F0F4F8)',
                        fontFamily: 'var(--font-body, system-ui, sans-serif)',
                    }}
                >
                    <div
                        style={{
                            background: 'white',
                            borderRadius: 'var(--radius-lg, 0.75rem)',
                            padding: '2rem',
                            maxWidth: '400px',
                            width: '100%',
                            boxShadow: 'var(--shadow-md, 0 4px 6px rgba(0,0,0,0.1))',
                        }}
                    >
                        <h2
                            style={{
                                fontSize: '1.25rem',
                                color: '#1A202C',
                                marginBottom: '0.75rem',
                            }}
                        >
                            Une erreur est survenue
                        </h2>
                        <p style={{ color: '#718096', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                            L'application a rencontré un problème inattendu.
                        </p>
                        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                            <button
                                onClick={this.handleReset}
                                style={{
                                    padding: '0.6rem 1.2rem',
                                    borderRadius: 'var(--radius-md, 0.5rem)',
                                    border: '1px solid #DDD',
                                    background: 'white',
                                    cursor: 'pointer',
                                    fontSize: '0.9rem',
                                }}
                            >
                                Réessayer
                            </button>
                            <button
                                onClick={this.handleReload}
                                style={{
                                    padding: '0.6rem 1.2rem',
                                    borderRadius: 'var(--radius-md, 0.5rem)',
                                    border: 'none',
                                    background: 'var(--color-primary, #DC2626)',
                                    color: 'white',
                                    cursor: 'pointer',
                                    fontSize: '0.9rem',
                                }}
                            >
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
