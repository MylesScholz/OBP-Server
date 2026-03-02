import styled from '@emotion/styled'

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
    return (
        <DatasetsPageContainer>
            <FlowBar />
            <DatasetsPanel />
        </DatasetsPageContainer>
    )
}