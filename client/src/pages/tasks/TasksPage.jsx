import styled from '@emotion/styled'
import { Navigate } from 'react-router'

import { useAuth } from '../../AuthProvider'
import FlowBar from '../../components/FlowBar'
import TaskPanel from './TaskPanel'

const TasksPageContainer = styled.div`
    display: flex;
    flex-direction: column;
    justify-content: start;
    align-items: stretch;
    gap: 15px;
`

export default function TasksPage() {
    const { loggedIn } = useAuth()

    return (
        <TasksPageContainer>
            { loggedIn ? (
                <>
                    <FlowBar />
                    <TaskPanel />
                </>
            ) : (
                <Navigate to='/' />
            )}
        </TasksPageContainer>
    )
}