import styled from '@emotion/styled'

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
    return (
        <TasksPageContainer>
            <FlowBar />
            <TaskPanel />
        </TasksPageContainer>
    )
}