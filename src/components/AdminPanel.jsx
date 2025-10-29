import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import styled from '@emotion/styled'

import AdminToolList from './AdminToolList'
import UsernamesAccessForm from './UsernamesAccessForm'
import AdminManagementForm from './AdminManagementForm'
import ArchiveBrowser from './ArchiveBrowser'
import DeterminationsAccessForm from './DeterminationsAccessForm'
import PlantListAccessForm from './PlantListAccessForm'
import StewardshipReportForm from './StewardshipReportForm'

const AdminPanelContainer = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 10px;

    border: 1px solid gray;
    border-radius: 5px;

    padding: 25px;
`

export default function AdminPanel({ loggedIn, setLoggedIn }) {
    const [ selectedTool, setSelectedTool ] = useState('plantList')

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
                    <AdminToolList selectedTool={selectedTool} setSelectedTool={setSelectedTool} />

                    { selectedTool === 'plantList' &&
                        <PlantListAccessForm />
                    }
                    { selectedTool === 'determinations' &&
                        <DeterminationsAccessForm />
                    }
                    { selectedTool === 'usernames' &&
                        <UsernamesAccessForm />
                    }
                    { selectedTool === 'archive' &&
                        <ArchiveBrowser />
                    }
                    { selectedTool === 'accountManager' &&
                        <AdminManagementForm />
                    }
                    { selectedTool === 'stewardshipReport' &&
                        <StewardshipReportForm />
                    }
                </AdminPanelContainer>
            }
        </>
    )
}