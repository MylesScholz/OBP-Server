import styled from '@emotion/styled'
import { Navigate } from 'react-router'

import FlowBar from '../../components/FlowBar'
import Dashboard from './Dashboard'
import { useAuth } from '../../AuthProvider'

const DashboardPageContainer = styled.div`
    display: flex;
    flex-direction: column;
    justify-content: start;
    align-items: stretch;
    gap: 15px;
`

export default function DashboardPage() {
    const { admin, volunteer } = useAuth()

    return (
        <DashboardPageContainer>
            { admin || volunteer ? (
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