const DevIndicator = () => {
    const isDev = import.meta.env.DEV ||
        import.meta.env.VITE_SUPABASE_URL?.includes('dev')

    if (!isDev) return null

    return (
        <div style={{
            position: 'fixed',
            bottom: '8px',
            right: '8px',
            background: '#f59e0b',
            color: 'white',
            padding: '4px 12px',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: 'bold',
            zIndex: 9999,
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            pointerEvents: 'none'
        }}>
            DEV
        </div>
    )
}

export default DevIndicator
