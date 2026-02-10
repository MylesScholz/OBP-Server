import styled from '@emotion/styled'
import { Navigate } from 'react-router'

import FlowBar from '../../components/FlowBar'
import AdminPanel from './AdminPanel'
import { useAuth } from '../../AuthProvider'

const AdminPageContainer = styled.div`
    display: flex;
    flex-direction: column;
    justify-content: start;
    align-items: stretch;
    gap: 15px;
`

export default function AdminPage() {
    const { loggedIn } = useAuth()

    return (
        <AdminPageContainer>
            { loggedIn ? (
                <>
                    <FlowBar />
                    <AdminPanel />
                </>
            ) : (
                <Navigate to='/' />
            )}
        </AdminPageContainer>
    )
}