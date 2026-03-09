import React, { createContext, useState, useCallback, useContext } from 'react'
import Toast from '../components/Toast'

const ToastContext = createContext(null)

let nextId = 0

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([])

    const addToast = useCallback((message, type = 'info', duration = 4000) => {
        const id = nextId++
        setToasts((prev) => [...prev, { id, message, type }])
        if (duration > 0) {
            setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), duration)
        }
    }, [])

    const removeToast = useCallback((id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
    }, [])

    return (
        <ToastContext.Provider value={{ addToast, removeToast }}>
            {children}
            <Toast toasts={toasts} onDismiss={removeToast} />
        </ToastContext.Provider>
    )
}

export const useToast = () => useContext(ToastContext)
