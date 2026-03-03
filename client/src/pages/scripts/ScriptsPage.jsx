import styled from '@emotion/styled'

import FlowBar from '../../components/FlowBar'
import ScriptsPanel from './ScriptsPanel'

const ScriptsPageContainer = styled.div`
    display: flex;
    flex-direction: column;
    justify-content: start;
    align-items: stretch;
    gap: 15px;
`

export default function ScriptsPage() {
    return (
        <ScriptsPageContainer>
            <FlowBar />
            <ScriptsPanel />
        </ScriptsPageContainer>
    )
}