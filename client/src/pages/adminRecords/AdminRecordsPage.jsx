import styled from '@emotion/styled'
import { useOutletContext, Navigate } from 'react-router'

const AdminRecordsPageContainer = styled.div`
    
`

export default function AdminRecordsPage() {
    const [ loggedIn, setLoggedIn ] = useOutletContext()

    return (
        <AdminRecordsPageContainer>
            { !loggedIn && <Navigate to='/' /> }
        </AdminRecordsPageContainer>
    )
}