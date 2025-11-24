import { useState } from 'react'
import styled from '@emotion/styled'

import AdminAccountForm from './AdminAccountForm.jsx'

const LogInButtonContainer = styled.div`
    position: relative;
    display: flex;
    flex-direction: row;
    justify-content: start;
    align-items: center;

    white-space: nowrap;

    #logInButton {
        border: none;
        border-radius: 0px;

        padding: 0px;

        font-size: 16pt;
        color: white;

        background: transparent;

        &:hover {
            text-decoration: underline;
        }
    }
`

export default function LogInButton({ loggedIn, setLoggedIn }) {
    const [ accountModalOpen, setAccountModalOpen ] = useState(false)

    return (
        <LogInButtonContainer onKeyDown={(e) => e.key === 'Escape' ? setAccountModalOpen(false) : null }>
            <button id='logInButton' onClick={(e) => setAccountModalOpen(!accountModalOpen)}>
                { loggedIn ? `Account: ${loggedIn}` : 'Log In' }
            </button>
            { accountModalOpen && <AdminAccountForm loggedIn={loggedIn} setLoggedIn={setLoggedIn} setAccountModalOpen={setAccountModalOpen} /> }
        </LogInButtonContainer>
    )
}