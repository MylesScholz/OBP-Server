import { useState } from 'react'
import axios from 'axios'
import styled from '@emotion/styled'

const AdminAccountFormContainer = styled.form`
    display: flex;
    flex-direction: column;
    gap: 10px;

    border: 1px solid gray;
    border-radius: 5px;

    padding: 20px;
    
    h2 {
        margin: 0px;

        font-size: 16pt;
    }

    div {
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
        gap: 10px;

        white-space: nowrap;
    }
`

export default function AdminAccountForm({ loggedIn, setLoggedIn }) {
    const [ formDisabled, setFormDisabled ] = useState(false)

    const serverAddress = `${import.meta.env.VITE_SERVER_HOST || 'localhost'}`

    function handleSubmit(event) {
        event.preventDefault()
        setFormDisabled(true)

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
                    setLoggedIn(true)
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
                    setLoggedIn(false)
                }
            }).catch((error) => {
                setFormDisabled(false)
            })
        }
    }

    return (
        <AdminAccountFormContainer onSubmit={ handleSubmit } disabled={formDisabled}>
            <h2>Admin Account</h2>
            { !loggedIn &&
                <>
                    <div>
                        <label for='adminUsername'>Username:</label>
                        <input type='text' id='adminUsername'></input>
                    </div>
                    <div>
                        <label for='adminPassword'>Password:</label>
                        <input type='password' id='adminPassword'></input>
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