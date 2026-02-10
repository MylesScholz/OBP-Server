import { useState } from 'react'
import axios from 'axios'
import styled from '@emotion/styled'

import { useAuth } from '../AuthProvider'
import { useNavigate } from 'react-router'

const LogoutModalContainer = styled.form`
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

    input {
        border: 1px solid #222;
        border-radius: 5px;

        padding: 5px;

        font-size: 12pt;

        background-color: white;

        &:hover {
            background-color: #efefef;
        }
    }
`

export default function LogoutModal({ setAccountModalOpen }) {
    const [ formDisabled, setFormDisabled ] = useState(false)
    const { admin, setAdmin, volunteer, setVolunteer } = useAuth()
    const navigate = useNavigate()

    function handleSubmit(event) {
        event.preventDefault()
        setFormDisabled(true)
        setAccountModalOpen(false)

        if (admin) {
            axios.post('/api/admins/logout').then((res) => {
                setFormDisabled(false)
                if (res.status === 200) {
                    setAdmin(null)
                }
            }).catch((error) => {
                console.error(error)
                setFormDisabled(false)
            })
        } else if (volunteer) {
            setVolunteer(null)
            setFormDisabled(false)
            navigate('/')
        }
    }

    return (
        <LogoutModalContainer onSubmit={ handleSubmit } disabled={formDisabled}>
            <input type='submit' id='logoutSubmit' value='Log Out' />
        </LogoutModalContainer>
    )
}