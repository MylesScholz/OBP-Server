import styled from '@emotion/styled'
import { Navigate } from 'react-router'

import { useAuth } from '../../AuthProvider'
import FlowBar from '../../components/FlowBar'
import Dashboard from './Dashboard'

const DashboardPageContainer = styled.div`
    display: flex;
    flex-direction: column;
    justify-content: start;
    align-items: stretch;
    gap: 15px;
`

export default function DashboardPage() {
    const { loggedIn } = useAuth()

    return (
        <DashboardPageContainer>
            { loggedIn ? (
                <>
                    <FlowBar />
                    <Dashboard />
                </>
            ) : (
                <Navigate to='/' />
            )}
        </DashboardPageContainer>
    )
}