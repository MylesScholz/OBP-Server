import styled from '@emotion/styled'

import TaskPanel from './components/TaskPanel.jsx'
import AdminPanel from './components/AdminPanel.jsx'

const AppContainer = styled.div`
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 25px;

    padding: 50px;

    min-width: 600px;

    #appTitle {
        display: flex;
        flex-direction: column;
        align-items: center;

        h1 {
            margin: 0px;

            font-size: 24pt;

            white-space: nowrap;
        }

        h3 {
            margin: 0px;
            
            text-align: center;
            font-weight: normal;
            font-size: 18pt;
        }
    }
`

function App() {
    return (
        <AppContainer>
            <div id='appTitle'>
                <h1>Beeline</h1>
                <h3>The Bee Atlas Automated Interaction-Occurrence Data Pipeline</h3>
            </div>
            <TaskPanel />
            <AdminPanel />
        </AppContainer>
    )
}

export default App