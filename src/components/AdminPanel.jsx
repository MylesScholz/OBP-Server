import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import styled from '@emotion/styled'

import AdminAccountForm from './AdminAccountForm'
import UsernamesQueryBuilder from './UsernamesQueryBuilder'
import AdminManagementForm from './AdminManagementForm'

const AdminPanelContainer = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    
    margin: 0px 10%;

    border: 1px solid gray;
    border-radius: 5px;

    padding: 25px;
`

export default function AdminPanel() {
    const [ loggedIn, setLoggedIn ] = useState()

    const serverAddress = `${import.meta.env.VITE_SERVER_HOST || 'localhost'}`

    useQuery({
        queryKey: ['loggedInQuery'],
        queryFn: async () => {
            const queryURL = `http://${serverAddress}/api/admins/login`
            axios.get(queryURL).then((res) => {
                if (res.status === 200) {
                    setLoggedIn(res.data.username)
                } else {
                    setLoggedIn(undefined)
                }
            })
            return
        },
        refetchInterval: 300000,    // 5 minutes
        refetchOnMount: 'always'
    })

    return (
        <AdminPanelContainer>
            <AdminAccountForm loggedIn={loggedIn} setLoggedIn={setLoggedIn} />
            { loggedIn &&
                <>
                    <UsernamesQueryBuilder />
                    <AdminManagementForm />
                </>
            }
        </AdminPanelContainer>
    )
}