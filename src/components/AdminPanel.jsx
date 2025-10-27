import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import styled from '@emotion/styled'

import UsernamesQueryBuilder from './UsernamesQueryBuilder'
import AdminManagementForm from './AdminManagementForm'
import ArchiveBrowser from './ArchiveBrowser'
import DeterminationsAccessForm from './DeterminationsAccessForm'
import PlantListAccessForm from './PlantListAccessForm'

const AdminPanelContainer = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 10px;

    border: 1px solid gray;
    border-radius: 5px;

    padding: 25px;
`

export default function AdminPanel({ loggedIn, setLoggedIn }) {
    const serverAddress = `${import.meta.env.VITE_SERVER_HOST || 'localhost'}`

    useQuery({
        queryKey: ['loggedInQuery'],
        queryFn: async () => {
            const queryURL = `http://${serverAddress}/api/admins/login`
            axios.get(queryURL).then((res) => {
                if (res.status === 200) {
                    setLoggedIn(res.data.username)
                } else {
                    setLoggedIn(null)
                }
            })
            return
        },
        refetchInterval: 300000,    // 5 minutes
        refetchOnMount: 'always'
    })

    return (
        <>
            { loggedIn &&
                <AdminPanelContainer>
                    <PlantListAccessForm />
                    <DeterminationsAccessForm />
                    <UsernamesQueryBuilder />
                    <AdminManagementForm />
                    <ArchiveBrowser />
                </AdminPanelContainer>
            }
        </>
    )
}