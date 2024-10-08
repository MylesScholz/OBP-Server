import styled from '@emotion/styled'

import TaskPanel from './components/TaskPanel.jsx'

const AppContainer = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 25px;

    padding: 50px;

    h1 {
        margin: 0px;

        font-size: 24pt;

        white-space: nowrap;
    }
`

function App() {
    return (
        <AppContainer>
            <h1>Oregon Bee Project Server</h1>
            <TaskPanel />
        </AppContainer>
    )
}

export default App