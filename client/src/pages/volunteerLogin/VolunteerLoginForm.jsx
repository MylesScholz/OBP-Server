import { useState } from 'react'
import { useNavigate, Link } from 'react-router'
import styled from '@emotion/styled'
import axios from 'axios'

import arrowBackIcon from '/src/assets/arrow_back.svg'
import { useAuth } from '../../AuthProvider'
import { useFlow } from '../../FlowProvider'

const VolunteerLoginFormContainer = styled.form`
    display: grid;
    grid-template-columns: 215px 400px;
    grid-template-rows: repeat(4, 1fr);
    grid-column-gap: 10px;
    grid-row-gap: 15px;

    border: 1px solid #222;
    border-radius: 5px;

    padding: 25px;

    white-space: nowrap;

    background-color: white;

    color: #222;

    input {
        border: 1px solid gray;
        border-radius: 5px;

        padding: 10px;

        font-size: 16pt;

        background-color: white;
    }

    p {
        display: flex;
        justify-content: center;
        align-items: center;

        margin: 0px;

        font-size: 16pt;
        font-weight: bold;
    }

    label {
        grid-column: 1 / 2;

        display: flex;
        flex-direction: row;
        justify-content: start;
        align-items: center;

        margin: 0px;

        font-size: 16pt;
    }

    #volunteerLoginFormHeader {
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

    #volunteerUsername, #volunteerPassword {
        font-size: 14pt;

        &:focus {
            border: 1px solid #222;

            outline: none;
        }
    }

    #volunteerSubmit {
        grid-column: 1 / 3;

        &:hover {
            background-color: #efefef;
        }
    }
`

export default function VolunteerLoginForm() {
    const [ disabled, setDisabled ] = useState(false)
    const { admin, setVolunteer } = useAuth()
    const { query, setQuery } = useFlow()
    const navigate = useNavigate()

    async function handleSubmit(event) {
        event.preventDefault()

        if (disabled) return
        setDisabled(true)

        const username = event.target.volunteerUsername.value
        const password = event.target.volunteerPassword.value ?? ''
        if (username && password.toLowerCase() === import.meta.env.VITE_VOLUNTEER_PASSWORD) {
            // Query by both userLogin and recordedBy; use either result
            const userLoginQueryUrl = `/api/occurrences?per_page=1&userLogin=${username}&recordedBy=%28non-empty%29`
            const fullNameQueryUrl = `/api/occurrences?per_page=1&userLogin=%28non-empty%29&recordedBy=${username}`

            const userLoginResponse = await axios.get(userLoginQueryUrl).catch((error) => console.error(error))
            const fullNameResponse = await axios.get(fullNameQueryUrl).catch((error) => console.error(error))

            const occurrence = userLoginResponse?.data?.data?.at(0) || fullNameResponse?.data?.data?.at(0)

            if (occurrence) {
                setVolunteer(!admin ? occurrence['userLogin'] : null)   // Admin login supercedes volunteer
                setQuery({ ...query, valueQueries: { 'userLogin': occurrence['userLogin'] } })
                navigate('/dashboard')
            }

            setDisabled(false)
        } else {
            setDisabled(false)
        }

        event.target.reset()
    }

    return (
        <VolunteerLoginFormContainer onSubmit={ handleSubmit } disabled={disabled}>
            <div id='volunteerLoginFormHeader'>
                <Link to='/'>
                    <img src={arrowBackIcon} alt='Back' />
                </Link>
                <h2>Volunteer Log In</h2>
            </div>

            <label htmlFor='volunteerUsername'>iNaturalist Username<br />or Full Name</label>
            <input type='text' id='volunteerUsername' placeholder='Enter an iNaturalist username or full name...' required />

            <label>Password</label>
            <input type='password' id='volunteerPassword' placeholder='Enter a password...' required />
            
            <input type='submit' id='volunteerSubmit' value='Log In' />
        </VolunteerLoginFormContainer>
    )
}