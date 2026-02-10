import { useState } from 'react'
import styled from '@emotion/styled'

import LogoutModal from './LogoutModal.jsx'
import { useAuth } from '../AuthProvider.jsx'

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

export default function CurrentUserButton() {
    const [ accountModalOpen, setAccountModalOpen ] = useState(false)
    const { admin, volunteer } = useAuth()

    return (
        <CurrentUserButtonContainer onKeyDown={(e) => e.key === 'Escape' ? setAccountModalOpen(false) : null }>
            <button id='logInButton' onClick={(e) => setAccountModalOpen(!accountModalOpen)}>
                { admin || volunteer ? `User: ${admin || volunteer}` : 'Log In' }
            </button>
            { accountModalOpen && <LogoutModal setAccountModalOpen={setAccountModalOpen} /> }
        </CurrentUserButtonContainer>
    )
}