import { createContext, useContext, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'

const AuthContext = createContext()

export function AuthProvider({ children }) {
    const [ loggedIn, setLoggedIn ] = useState(null)

    useQuery({
        queryKey: ['loggedInQuery'],
        queryFn: async () => {
            axios.get('/api/admins/login').then((res) => {
                if (res.status === 200) {
                    setLoggedIn(res.data.username)
                } else {
                    setLoggedIn(null)
                }
            })
            return
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