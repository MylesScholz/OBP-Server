import styled from '@emotion/styled'

import SubtaskPipeline from './SubtaskPipeline'

const TaskPanelContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;

    border: 1px solid gray;
    border-radius: 5px;

    padding: 20px;

    h1 {
        margin: 0px;

        font-size: 18pt;
    }
`

export default function TaskPanel({ loggedIn }) {
    return (
        <TaskPanelContainer>
            <h1>Tasks</h1>
            <SubtaskPipeline loggedIn={loggedIn} />
        </TaskPanelContainer>
    )
}