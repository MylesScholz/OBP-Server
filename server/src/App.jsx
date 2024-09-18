import { useState } from 'react'
import styled from '@emotion/styled'

import TaskQueryBuilder from './components/TaskQueryBuilder.jsx'
import TaskTracker from './components/TaskTracker.jsx'

const AppContainer = styled.div``

function App() {
    const [ queryResponse, setQueryResponse ] = useState({ status: '', data: {} })

    return (
        <AppContainer>
            <h1>Welcome!</h1>
            <TaskQueryBuilder setQueryResponse={setQueryResponse} />
            <TaskTracker queryResponse={queryResponse} />
        </AppContainer>
    )
}

export default App