import { createContext, useContext, useState } from 'react'

const AuthContext = createContext()

export function AuthProvider({ children }) {
    const [ loggedIn, setLoggedIn ] = useState(null)

    return (
        <AuthContext.Provider value={{ loggedIn, setLoggedIn }}>
            { children }
        </AuthContext.Provider>
    )
}

export const useAuth = () => useContext(AuthContext)