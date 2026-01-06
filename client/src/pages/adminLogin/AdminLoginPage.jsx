import styled from '@emotion/styled'
import { useOutletContext, Navigate } from 'react-router'

import AdminLoginForm from './AdminLoginForm'

const AdminLoginPageContainer = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;

    padding: 50px;
`

export default function AdminLoginPage() {
    const [ loggedIn, setLoggedIn ] = useOutletContext()

    return (
        <AdminLoginPageContainer>
            { loggedIn ? <Navigate to='/adminRecords' /> : <AdminLoginForm loggedIn={loggedIn} setLoggedIn={setLoggedIn} /> }
        </AdminLoginPageContainer>
    )
}