import { createContext, useContext, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'

const AuthContext = createContext()

export function AuthProvider({ children }) {
    const [ admin, setAdmin ] = useState(null)
    const [ volunteer, setVolunteer ] = useState(null)
    const [ blockLogOut, setBlockLogOut ] = useState(false)

    useQuery({
        queryKey: ['adminQuery'],
        queryFn: async () => {
            const response = await axios.get('/api/admins/login')

            if (response?.status === 200) {
                setAdmin(response?.data?.username)
            } else {
                setAdmin(null)
            }

            return { status: response?.status, data: response?.data }
        },
        refetchInterval: 300000,    // 5 minutes
        refetchOnMount: 'always'
    })

    return (
        <AuthContext.Provider value={{ admin, setAdmin, volunteer, setVolunteer, blockLogOut, setBlockLogOut }}>
            { children }
        </AuthContext.Provider>
    )
}

export const useAuth = () => useContext(AuthContext)