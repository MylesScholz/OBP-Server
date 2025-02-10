import styled from '@emotion/styled'

import TaskPanel from './components/TaskPanel.jsx'

const AppContainer = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;

    padding: 50px;

    h1 {
        margin: 0px;
        margin-bottom: 10px;

        font-size: 24pt;

        white-space: nowrap;
    }

    h3 {
        margin: 0px;
        margin-bottom: 50px;
        
        text-align: center;
        font-weight: normal;
        font-size: 18pt;
    }
`

function App() {
    return (
        <AppContainer>
            <h1>Beeline</h1>
            <h3>The Oregon Bee Atlas Automated Interaction-Occurrence Data Pipeline</h3>
            <TaskPanel />
        </AppContainer>
    )
}

export default App