import { useState } from 'react'
import { useNavigate, Link } from 'react-router'
import styled from '@emotion/styled'
import axios from 'axios'

import arrowBackIcon from '/src/assets/arrow_back.svg'
import { useAuth } from '../../AuthProvider'
import { useFlow } from '../../FlowProvider'

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

    label {
        display: flex;
        flex-direction: row;
        align-items: center;

        margin: 0px;

        font-size: 16pt;
    }

    input {
        border: 1px solid gray;
        border-radius: 5px;

        padding: 10px;

        font-size: 16pt;

        background-color: white;
    }

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

    #adminUsername, #adminPassword {
        font-size: 14pt;

        &:focus {
            border: 1px solid #222;

            outline: none;
        }
    }

    #loginSubmit {
        grid-column: 1 / 3;

        &:hover {
            background-color: #efefef;
        }
    }
`

export default function AdminLoginForm() {
    const [ disabled, setDisabled ] = useState(false)
    const { setAdmin, setVolunteer } = useAuth()
    const { query, setQuery } = useFlow()
    const navigate = useNavigate()

    function handleSubmit(event) {
        event.preventDefault()
        setDisabled(true)

        const credentials = {
            username: event.target.adminUsername.value,
            password: event.target.adminPassword.value
        }
        event.target.reset()

        axios.post('/api/admins/login', credentials).then((res) => {
            setDisabled(false)
            if (res.status === 200) {
                setAdmin(credentials.username)
                setVolunteer(null)  // Admin login supercedes volunteer
                setQuery({ ...query, valueQueries: {} })
                navigate('/dashboard')
            }
        }).catch((error) => {
            console.error(error)
            setDisabled(false)
        })
    }

    return (
        <AdminLoginFormContainer onSubmit={ handleSubmit } disabled={disabled}>
            <div id='adminLoginFormHeader'>
                <Link to='/'>
                    <img src={arrowBackIcon} alt='Back' />
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