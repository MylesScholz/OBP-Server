import styled from '@emotion/styled'
import { Navigate } from 'react-router'

import AdminLoginForm from './AdminLoginForm'
import { useAuth } from '../../AuthProvider'

const AdminLoginPageContainer = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;

    padding: 50px;
`

export default function AdminLoginPage() {
    const { loggedIn } = useAuth()

    console.log('/adminLogin:', loggedIn)

    return (
        <AdminLoginPageContainer>
            { loggedIn ? <Navigate to='/dashboard' /> : <AdminLoginForm /> }
        </AdminLoginPageContainer>
    )
}