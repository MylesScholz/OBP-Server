import { useState } from 'react'
import styled from '@emotion/styled'

import TaskQueryBuilder from './TaskQueryBuilder'
import TaskTracker from './TaskTracker'

const TaskPanelContainer = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 10px;

    margin: 0px 10%;
`

export default function TaskPanel() {
    const [ queryResponse, setQueryResponse ] = useState()
    const [ result, setResult ] = useState()
    const [ formDisabled, setFormDisabled ] = useState(false)

    return (
        <TaskPanelContainer>
            <TaskQueryBuilder setQueryResponse={setQueryResponse} setResult={setResult} formDisabled={formDisabled} setFormDisabled={setFormDisabled} />
            <TaskTracker queryResponse={queryResponse} result={result} setResult={setResult} setFormDisabled={setFormDisabled} />
        </TaskPanelContainer>
    )
}