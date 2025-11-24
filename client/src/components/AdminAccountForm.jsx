import { useState } from 'react'
import axios from 'axios'
import styled from '@emotion/styled'

const AdminAccountFormContainer = styled.form`
    position: absolute;
    top: 30px;
    right: 0px;

    display: flex;
    flex-direction: column;
    gap: 5px;

    padding: 15px;

    white-space: nowrap;

    background-color: white;
    box-shadow: 2px 2px 5px rgba(0, 0, 0, 0.2);

    color: black;
    
    h3 {
        margin: 0px;

        font-size: 12pt;
    }

    p {
        margin: 0px;

        font-size: 12pt;
    }

    div {
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
        gap: 10px;
    }
`

export default function AdminAccountForm({ loggedIn, setLoggedIn, setAccountModalOpen }) {
    const [ formDisabled, setFormDisabled ] = useState(false)

    const serverAddress = `${import.meta.env.VITE_SERVER_HOST || 'localhost'}`

    function handleSubmit(event) {
        event.preventDefault()
        setFormDisabled(true)
        setAccountModalOpen(false)

        if (event.target.loginSubmit) {
            const credentials = {
                username: event.target.adminUsername.value,
                password: event.target.adminPassword.value
            }
            event.target.reset()
    
            const queryURL = `http://${serverAddress}/api/admins/login`
            axios.post(queryURL, credentials).then((res) => {
                setFormDisabled(false)
                if (res.status === 200) {
                    setLoggedIn(credentials.username)
                }
            }).catch((error) => {
                setFormDisabled(false)
            })
        }

        if (event.target.logoutSubmit) {
            const queryURL = `http://${serverAddress}/api/admins/logout`
            axios.post(queryURL).then((res) => {
                setFormDisabled(false)
                if (res.status === 200) {
                    setLoggedIn(undefined)
                }
            }).catch((error) => {
                setFormDisabled(false)
            })
        }
    }

    return (
        <AdminAccountFormContainer onSubmit={ handleSubmit } disabled={formDisabled}>
            { !loggedIn &&
                <>
                    <h3>Admin Account</h3>
                    <div>
                        <label for='adminUsername'>Username:</label>
                        <input type='text' id='adminUsername' />
                    </div>
                    <div>
                        <label for='adminPassword'>Password:</label>
                        <input type='password' id='adminPassword' />
                    </div>
                    <input type='submit' id='loginSubmit' value='Log In' />
                </>
            }
            { loggedIn &&
                <input type='submit' id='logoutSubmit' value='Log Out' />
            }
        </AdminAccountFormContainer>
    )
}