import styled from '@emotion/styled'

const OccurrencesPanelContainer = styled.div`
    position: relative;

    display: grid;
    grid-template-columns: repeat(61, 1fr);
    grid-auto-rows: 22px;

    padding-bottom: 12px;

    overflow: scroll;
    scroll-snap-type: y proximity;

    p {
        margin: 0px;

        border: 0.5px solid #222;

        padding: 2px;

        font-size: 10pt;

        white-space: nowrap;

        background-color: white;

        scroll-snap-align: start;
        scroll-margin: 22px;
    }

    .field {
        position: sticky;
        top: 0px;

        background-color: #dfdfdf;
    }
`

export function OccurrencesPanel({ occurrences }) {
    occurrences ??= []
    const fields = [
        'errorFlags',
        'dateLabelPrint',
        'fieldNumber',
        'catalogNumber',
        'occurrenceID',
        'userId',
        'userLogin',
        'firstName',
        'firstNameInitial',
        'lastName',
        'recordedBy',
        'sampleId',
        'specimenId',
        'day',
        'month',
        'year',
        'day2',
        'month2',
        'year2',
        'startDayofYear',
        'endDayofYear',
        'verbatimEventDate',
        'country',
        'stateProvince',
        'county',
        'locality',
        'verbatimElevation',
        'decimalLatitude',
        'decimalLongitude',
        'coordinateUncertaintyInMeters',
        'samplingProtocol',
        'relationshipOfResource',
        'resourceID',
        'relatedResourceID',
        'relationshipRemarks',
        'phylumPlant',
        'orderPlant',
        'familyPlant',
        'genusPlant',
        'speciesPlant',
        'taxonRankPlant',
        'url',
        'phylum',
        'class',
        'order',
        'family',
        'genus',
        'subgenus',
        'specificEpithet',
        'taxonomicNotes',
        'scientificName',
        'sex',
        'caste',
        'taxonRank',
        'identifiedBy',
        'familyVolDet',
        'genusVolDet',
        'speciesVolDet',
        'sexVolDet',
        'casteVolDet',
    ]

    let row = 1
    return (
        <OccurrencesPanelContainer>
            <p className='field'>#</p>
            { fields.map((field) => <p className='field'>{field}</p>) }
            { occurrences?.map((occurrence) => (
                <>
                    <p>{row++}</p>
                    {fields.map((field) => <p>{occurrence[field]}</p>)}
                </>
            ))}
        </OccurrencesPanelContainer>
    )
}