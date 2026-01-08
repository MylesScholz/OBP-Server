import styled from '@emotion/styled'

const OccurrenceRecordContainer = styled.div`
    
`

export default function OccurrenceRecord({ occurrence }) {
    return (
        <OccurrenceRecordContainer>
            <p>{JSON.stringify(occurrence)}</p>
        </OccurrenceRecordContainer>
    )
}