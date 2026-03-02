import { Navigate, Outlet } from 'react-router'

import { useAuth } from './AuthProvider'

export default function ProtectedRoute() {
    const { admin, isLoading } = useAuth()

    if (isLoading) return <h2 className='loadingMessage'>Loading...</h2>
    if (!admin) return <Navigate to='/' replace />
    return <Outlet />
}