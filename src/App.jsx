import { useState } from 'react'
import styled from '@emotion/styled'

import TaskPanel from './components/TaskPanel.jsx'
import AdminPanel from './components/AdminPanel.jsx'
import LogInButton from './components/LogInButton.jsx'

const AppContainer = styled.div`
    display: flex;
    flex-direction: column;
    align-items: stretch;

    min-width: 600px;

    header {
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        align-items: center;

        padding: 20px 100px;

        background-color: #222;

        #appTitleText {
            display: flex;
            flex-direction: row;
            justify-content: start;
            align-items: center;

            #appTitle {
                display: flex;
                flex-direction: row;
                justify-content: start;
                align-items: center;

                border-right: 1px solid white;

                padding: 10px 20px;

                h1 {
                    margin: 0px;

                    font-size: 24pt;
                    color: #e5cb22;

                    white-space: nowrap;
                }
            }

            #appSubtitle {
                display: flex;
                flex-direction: row;
                justify-content: start;
                align-items: center;

                padding: 10px 20px;

                h3 {
                    margin: 0px;
                    
                    text-align: center;
                    font-weight: normal;
                    font-size: 16pt;
                    color: white;
                }
            }
        }
    }

    main {
        display: flex;
        flex-direction: column;
        align-items: stretch;
        gap: 10px;

        padding: 20px 100px;
    }
`

function App() {
    const [ loggedIn, setLoggedIn ] = useState()

    return (
        <AppContainer>
            <header>
                <div id='appTitleText'>
                    <div id='appTitle'>
                        <h1>Beeline</h1>
                    </div>
                    <div id='appSubtitle'>
                        <h3>The Bee Atlas Automated Interaction-Occurrence Data Pipeline</h3>
                    </div>
                </div>
                <LogInButton loggedIn={loggedIn} setLoggedIn={setLoggedIn} />
            </header>
            <main>
                <TaskPanel loggedIn={loggedIn} />
                <AdminPanel loggedIn={loggedIn} setLoggedIn={setLoggedIn} />
            </main>
        </AppContainer>
    )
}

export default App