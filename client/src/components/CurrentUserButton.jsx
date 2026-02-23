import { useState } from 'react'
import styled from '@emotion/styled'
import axios from 'axios'

import LogoutModal from './LogoutModal.jsx'
import { useAuth } from '../AuthProvider.jsx'

const CurrentUserButtonForm = styled.form`
    position: relative;
    display: flex;
    flex-direction: row;
    justify-content: start;
    align-items: center;

    white-space: nowrap;

    #currentUser {
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

    .navBlockBackground {
        z-index: 10000;
        position: fixed;
        top: 0;
        right: 0;
        bottom: 0;
        left: 0;

        display: flex;
        justify-content: center;
        align-items: center;

        background-color: rgba(0, 0, 0, 0.1);

        user-select: none;
        -webkit-user-select: none;

        .navBlockModal {
            display: grid;
            grid-template-columns: 1fr 1fr;
            grid-auto-rows: 1fr;
            grid-column-gap: 15px;
            grid-row-gap: 15px;

            border: 1px solid #222;
            border-radius: 5px;

            padding: 20px;

            background-color: white;

            p {
                grid-column: 1 / 3;

                margin: 0px;

                font-size: 12pt;

                text-align: center;
            }

            button {
                border: 1px solid gray;
                border-radius: 5px;

                padding: 5px;

                background-color: white;

                &:hover {
                    background-color: #efefef;
                }
            }
        }
    }
`

export default function CurrentUserButton() {
    const [ showLogoutModal, setShowLogoutModal ] = useState(false)
    const [ showBlockModal, setShowBlockModal ] = useState(false)
    const { admin, setAdmin, volunteer, setVolunteer, blockLogOut, setBlockLogOut } = useAuth()

    /* Handler Functions */

    function handleSubmit(event) {
        event?.preventDefault()
        setShowLogoutModal(false)

        if (blockLogOut) {
            setShowBlockModal(true)
            return
        }
        
        logOut()
    }

    function logOut() {
        if (admin) {
            axios.post('/api/admins/logout').then((res) => {
                if (res.status === 200) {
                    setAdmin(null)
                }
            }).catch((error) => {
                console.error(error)
            })
        } else if (volunteer) {
            setVolunteer(null)
        }
    }

    return (
        <CurrentUserButtonForm
            onSubmit={handleSubmit}
            onKeyDown={(event) => { if (event.key === 'Escape') setShowLogoutModal(false) } }
        >
            <button
                id='currentUser'
                onClick={(event) => {
                    event.preventDefault()
                    setShowLogoutModal(!showLogoutModal)
                }}
            >
                { admin || volunteer ? `User: ${admin || volunteer}` : '' }
            </button>

            { showLogoutModal && <LogoutModal /> }

            { showBlockModal &&
                <div className='navBlockBackground'>
                    <div className='navBlockModal'>
                        <p>You have unsubmitted changes. Are you sure you want to log out?</p>
                        <button onClick={(event) => {
                            event.preventDefault()
                            setShowBlockModal(false)
                            setBlockLogOut(false)
                            logOut()
                        }}>Leave</button>
                        <button onClick={() => setShowBlockModal(false)}>Stay</button>
                    </div>
                </div>
            }
        </CurrentUserButtonForm>
    )
}