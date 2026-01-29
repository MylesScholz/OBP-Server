import styled from '@emotion/styled'
import { Navigate } from 'react-router'

import { useAuth } from '../../AuthProvider'
import FlowBar from '../../components/FlowBar'
import DatasetsPanel from './DatasetsPanel'

const DatasetsPageContainer = styled.div`
    display: flex;
    flex-direction: column;
    justify-content: start;
    align-items: stretch;
    gap: 15px;
`

export default function DatasetsPage() {
    const { loggedIn } = useAuth()

    return (
        <DatasetsPageContainer>
            { loggedIn ? (
                <>
                    <FlowBar />
                    <DatasetsPanel />
                </>
            ) : (
                <Navigate to='/' />
            )}
        </DatasetsPageContainer>
    )
}