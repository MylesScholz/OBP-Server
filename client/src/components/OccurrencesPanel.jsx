import styled from '@emotion/styled'
import OccurrenceRecord from './OccurrenceRecord'

const OccurrencesPanelContainer = styled.div`
    display: flex;
    flex-direction: column;
    justify-content: start;
    align-items: stretch;

    #occurrenceFields {
        
    }
`

export function OccurrencesPanel({ occurrences }) {
    return (
        <OccurrencesPanelContainer>
            <div id='occurrenceFields'>

            </div>
            { occurrences?.map((occurrence) => <OccurrenceRecord occurrence={occurrence} />) }
        </OccurrencesPanelContainer>
    )
}