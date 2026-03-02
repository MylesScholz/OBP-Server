import styled from '@emotion/styled'
import { Navigate } from 'react-router'

import FlowBar from '../../components/FlowBar'
import DeterminationsEditor from './DeterminationsEditor'
import { useAuth } from '../../AuthProvider'

const DeterminationsPageContainer = styled.div`
    display: flex;
    flex-direction: column;
    justify-content: start;
    align-items: stretch;
    gap: 15px;
`

export default function DeterminationsPage() {
    const { volunteer } = useAuth()

    return (
        <DeterminationsPageContainer>
            { volunteer ? (
                <>
                    <FlowBar />
                    <DeterminationsEditor />
                </>
            ) : (
                <Navigate to='/' />
            )}
        </DeterminationsPageContainer>
    )
}