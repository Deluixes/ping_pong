import React, { createContext, useState, useContext, useEffect } from 'react'
import { storageService } from '../services/storage'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        // Check local session (could be cached in localStorage for "Remember me")
        const storedUser = localStorage.getItem('current_user')
        if (storedUser) {
            setUser(JSON.parse(storedUser))
        }
        setLoading(false)
    }, [])

    const login = async (username) => {
        // Simple login: Just name for now (as per requirements "Authentification simple")
        // In a real app we would check password hashes.

        // Check if user exists in shared storage, or create them
        const users = await storageService.getUsers()
        let foundUser = users.find(u => u.name.toLowerCase() === username.toLowerCase())

        if (!foundUser) {
            // Create new user automatically for this prototype
            foundUser = {
                id: crypto.randomUUID(),
                name: username,
                createdAt: new Date().toISOString()
            }
            await storageService.saveUser(foundUser)
        }

        setUser(foundUser)
        localStorage.setItem('current_user', JSON.stringify(foundUser))
        return foundUser
    }

    const logout = () => {
        setUser(null)
        localStorage.removeItem('current_user')
    }

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => useContext(AuthContext)
