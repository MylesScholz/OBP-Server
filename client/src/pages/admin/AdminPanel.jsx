import { useState } from 'react'
import styled from '@emotion/styled'

import AdminMenu from './AdminMenu'
import OAuthForm from './OAuthForm'
import AdminManagementForm from './AdminManagementForm'

const AdminPanelContainer = styled.div`
    display: grid;
    grid-template-columns: 3fr 9fr;
    grid-column-gap: 10px;
`

export default function AdminPanel() {
    const [ selectedTool, setSelectedTool ] = useState('authorization')

    return (
        <AdminPanelContainer>
            <AdminMenu selectedTool={selectedTool} setSelectedTool={setSelectedTool} />

            { selectedTool === 'authorization' &&
                <OAuthForm />
            }
            { selectedTool === 'accounts' &&
                <AdminManagementForm />
            }
        </AdminPanelContainer>
    )
}