import styled from '@emotion/styled'

import FlowBar from '../../components/FlowBar'
import AdminPanel from './AdminPanel'

const AdminPageContainer = styled.div`
    display: flex;
    flex-direction: column;
    justify-content: start;
    align-items: stretch;
    gap: 15px;
`

export default function AdminPage() {
    return (
        <AdminPageContainer>
            <FlowBar />
            <AdminPanel />
        </AdminPageContainer>
    )
}