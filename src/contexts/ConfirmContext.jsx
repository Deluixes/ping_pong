import React, { createContext, useState, useCallback, useContext, useRef } from 'react'
import ConfirmDialog from '../components/ConfirmDialog'

const ConfirmContext = createContext(null)

export function ConfirmProvider({ children }) {
    const [dialog, setDialog] = useState(null)
    const resolveRef = useRef(null)

    const confirm = useCallback(
        ({ title, message, confirmLabel = 'Confirmer', variant = 'danger' }) => {
            return new Promise((resolve) => {
                resolveRef.current = resolve
                setDialog({ title, message, confirmLabel, variant })
            })
        },
        []
    )

    const handleConfirm = useCallback(() => {
        resolveRef.current?.(true)
        setDialog(null)
    }, [])

    const handleCancel = useCallback(() => {
        resolveRef.current?.(false)
        setDialog(null)
    }, [])

    return (
        <ConfirmContext.Provider value={confirm}>
            {children}
            {dialog && (
                <ConfirmDialog {...dialog} onConfirm={handleConfirm} onCancel={handleCancel} />
            )}
        </ConfirmContext.Provider>
    )
}

export const useConfirm = () => useContext(ConfirmContext)
