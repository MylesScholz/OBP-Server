import { createContext, useContext, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'

const AuthContext = createContext()

export function AuthProvider({ children }) {
    const [ loggedIn, setLoggedIn ] = useState(null)

    useQuery({
        queryKey: ['loggedInQuery'],
        queryFn: async () => {
            const response = await axios.get('/api/admins/login')

            if (response?.status === 200) {
                setLoggedIn(response?.data?.username)
            } else {
                setLoggedIn(null)
            }

            return { status: response?.status, data: response?.data }
        },
        refetchInterval: 300000,    // 5 minutes
        refetchOnMount: 'always'
    })

    return (
        <AuthContext.Provider value={{ loggedIn, setLoggedIn }}>
            { children }
        </AuthContext.Provider>
    )
}

export const useAuth = () => useContext(AuthContext)