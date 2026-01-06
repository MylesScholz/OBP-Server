import { useState } from 'react'
import styled from '@emotion/styled'

import LogoutModal from './LogoutModal.jsx'

const CurrentUserButtonContainer = styled.div`
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

export default function CurrentUserButton({ loggedIn, setLoggedIn }) {
    const [ accountModalOpen, setAccountModalOpen ] = useState(false)

    return (
        <CurrentUserButtonContainer onKeyDown={(e) => e.key === 'Escape' ? setAccountModalOpen(false) : null }>
            <button id='logInButton' onClick={(e) => setAccountModalOpen(!accountModalOpen)}>
                { loggedIn ? `Account: ${loggedIn}` : 'Log In' }
            </button>
            { accountModalOpen && <LogoutModal loggedIn={loggedIn} setLoggedIn={setLoggedIn} setAccountModalOpen={setAccountModalOpen} /> }
        </CurrentUserButtonContainer>
    )
}