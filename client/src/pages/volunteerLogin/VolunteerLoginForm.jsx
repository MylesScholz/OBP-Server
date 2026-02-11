import { useState } from 'react'
import { useNavigate, Link } from 'react-router'
import styled from '@emotion/styled'
import axios from 'axios'

import arrowBackIcon from '/src/assets/arrow_back.svg'
import { useAuth } from '../../AuthProvider'
import { useFlow } from '../../FlowProvider'

const VolunteerLoginFormContainer = styled.form`
    display: grid;
    grid-template-columns: 375px 1fr 375px;
    grid-template-rows: 1fr 3fr 1fr;
    grid-column-gap: 30px;

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

    .volunteerSearchOption {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: stretch;
        gap: 15px;

        label {
            display: flex;
            justify-content: center;
            align-items: center;

            margin: 0px;

            font-size: 16pt;
            font-weight: bold;
        }

        #volunteerUsername, #volunteerFullName {
            font-size: 14pt;

            &:focus {
                border: 1px solid #222;

                outline: none;
            }
        }
    }

    #volunteerLoginFormHeader {
        position: relative;

        grid-column: 1 / 4;

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

    #volunteerSubmit {
        grid-column: 1 / 4;

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

    function handleSubmit(event) {
        event.preventDefault()

        if (disabled) return
        setDisabled(true)

        const fullName = event.target.volunteerFullName.value
        const username = event.target.volunteerUsername.value
        let queryUrl = username ? `/api/occurrences?per_page=1&userLogin=${username}&recordedBy=%28non-empty%29` : ''
        queryUrl = !queryUrl && fullName ? `/api/occurrences?per_page=1&userLogin=%28non-empty%29&recordedBy=${fullName}` : queryUrl

        if (queryUrl) {
            axios.get(queryUrl).then((res) => {
                const occurrence = res?.data?.data?.at(0)

                if (occurrence) {
                    setVolunteer(!admin ? occurrence['userLogin'] : null)   // Admin login supercedes volunteer
                    setQuery({ ...query, valueQueries: { 'userLogin': occurrence['userLogin'] } })
                    navigate('/dashboard')
                }
            }).catch((error) => {
                console.log(error)
            }).finally(() => {
                setDisabled(false)
            })
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
                <h2>Search for Volunteer Records</h2>
            </div>

            <div className='volunteerSearchOption'>
                <label htmlFor='volunteerUsername'>By iNaturalist Username</label>
                <input type='text' id='volunteerUsername' placeholder='Search for an iNaturalist username...' />
            </div>

            <p>or</p>

            <div className='volunteerSearchOption'>
                <label htmlFor='volunteerFullName'>By Full Name</label>
                <input type='text' id='volunteerFullName' placeholder='Search for a full name...' />
            </div>
            
            <input type='submit' id='volunteerSubmit' value='Search' />
        </VolunteerLoginFormContainer>
    )
}