import styled from '@emotion/styled'

import CurrentUserButton from './components/CurrentUserButton.jsx'
import { Outlet, useNavigate } from 'react-router'
import { useAuth } from './AuthProvider.jsx'
import { FlowProvider } from './FlowProvider.jsx'

const AppContainer = styled.div`
    display: flex;
    flex-direction: column;
    align-items: stretch;

    min-width: 1440px;

    header {
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        align-items: center;

        padding: 20px 100px;

        white-space: nowrap;

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

                cursor: pointer;

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

function App({ children }) {
    const { loggedIn } = useAuth()
    const navigate = useNavigate()

    return (
        <AppContainer>
            <header>
                <div id='appTitleText'>
                    <div id='appTitle' onClick={() => navigate('/') }>
                        <h1>Beeline</h1>
                    </div>
                    <div id='appSubtitle'>
                        <h3>The Bee Atlas Automated Interaction-Occurrence Data Pipeline</h3>
                    </div>
                </div>
                { loggedIn && <CurrentUserButton /> }
            </header>
            <main>
                <FlowProvider>
                    { children || <Outlet /> }
                </FlowProvider>
            </main>
        </AppContainer>
    )
}

export default App