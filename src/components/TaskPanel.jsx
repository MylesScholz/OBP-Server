import { useState } from 'react'
import styled from '@emotion/styled'

import TaskQueryBuilder from './TaskQueryBuilder'
import TaskTracker from './TaskTracker'

const TaskPanelContainer = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 10px;

    padding: 0px 10%;
`

export default function TaskPanel() {
    const [ queryResponse, setQueryResponse ] = useState()
    const [ result, setResult ] = useState()

    return (
        <TaskPanelContainer>
            <TaskQueryBuilder queryResponse={queryResponse} setQueryResponse={setQueryResponse} result={result} setResult={setResult} />
            <TaskTracker queryResponse={queryResponse} result={result} setResult={setResult} />
        </TaskPanelContainer>
    )
}