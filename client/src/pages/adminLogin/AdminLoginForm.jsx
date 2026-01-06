import { useState } from 'react'
import axios from 'axios'
import styled from '@emotion/styled'
import { Link } from 'react-router'

const AdminLoginFormContainer = styled.form`
    display: grid;
    grid-template-columns: 1fr 2fr;
    grid-template-rows: repeat(4, 1fr);
    grid-column-gap: 10px;
    grid-row-gap: 15px;

    border: 1px solid #222;
    border-radius: 5px;

    padding: 25px;

    white-space: nowrap;

    background-color: white;

    color: #222;

    #adminLoginFormHeader {
        position: relative;

        grid-column: 1 / 3;

        display: flex;
        flex-direction: row;
        justify-content: center;
        align-items: center;

        a {
            position: absolute;
            top: 0px;
            left: 0px;

            height: 100%;

            font-size: 14pt;

            &:link, &:visited {
                color: #222;
            }

            img {                
                height: 100%;
            }
        }
        
        h2 {
            display: flex;
            flex-direction: row;
            justify-content: center;
            align-items: center;

            margin: 0px;

            font-size: 20pt;
        }
    }

    label {
        display: flex;
        flex-direction: row;
        align-items: center;

        margin: 0px;

        font-size: 16pt;
    }

    input {
        font-size: 16pt;
    }

    #adminUsername, #adminPassword {
        border: 1px solid gray;
        border-radius: 5px;

        padding: 10px;

        font-size: 14pt;

        &:focus {
            border: 1px solid #222;

            outline: none;
        }
    }

    #loginSubmit {
        grid-column: 1 / 3;

        border: 1px solid #222;
        border-radius: 5px;

        background-color: white;

        &:hover {
            background-color: #efefef;
        }
    }
`

export default function AdminLoginForm({ loggedIn, setLoggedIn }) {
    const [ formDisabled, setFormDisabled ] = useState(false)

    const serverAddress = `${import.meta.env.VITE_SERVER_HOST || 'localhost'}`

    function handleSubmit(event) {
        event.preventDefault()
        setFormDisabled(true)

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
            console.error(error)
            setFormDisabled(false)
        })
    }
    return (
        <AdminLoginFormContainer onSubmit={ handleSubmit } disabled={formDisabled}>
            <div id='adminLoginFormHeader'>
                <Link to='/'>
                    <img src='/src/assets/arrow_back.svg' alt='Back' />
                </Link>
                <h2>Admin Account</h2>
            </div>

            <label htmlFor='adminUsername'>Username:</label>
            <input type='text' id='adminUsername' />

            <label htmlFor='adminPassword'>Password:</label>
            <input type='password' id='adminPassword' />

            <input type='submit' id='loginSubmit' value='Log In' />
        </AdminLoginFormContainer>
    )
}