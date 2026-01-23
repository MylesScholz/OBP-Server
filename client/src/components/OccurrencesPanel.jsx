import styled from '@emotion/styled'
import { useEffect } from 'react'
import { useRef } from 'react'

const OccurrencesPanelContainer = styled.div`
    position: relative;

    display: grid;
    grid-template-columns: repeat(61, 1fr);
    grid-auto-rows: 22px;

    padding-bottom: 12px;

    min-height: 600px;

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
    const scrollRef = useRef(null)

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
        'verbatimEventDate',
        'day2',
        'month2',
        'year2',
        'startDayofYear',
        'endDayofYear',
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

    // Convert vertical scrolling into horizontal scrolling
    useEffect(() => {
        const element = scrollRef.current
        if (!element) return

        const handleWheel = (event) => {
            event.preventDefault()

            const scrollAmount = event.deltaX !== 0 ? event.deltaX : event.deltaY

            element.scrollBy({
                left: scrollAmount * 4,
                behavior: 'smooth'
            })
        }

        element.addEventListener('wheel', handleWheel, { passive: false })

        return () => {
            element.removeEventListener('wheel', handleWheel)
        }
    }, [])

    return (
        <OccurrencesPanelContainer ref={scrollRef}>
            <p className='field'>#</p>
            { fields.map((field) => <p className='field' key={field}>{field}</p>) }
            { occurrences.map((occurrence, index) => (
                <>
                    <p key={`${occurrence._id},${index}`}>{index + 1}</p>
                    { fields.map((field) => <p key={`${occurrence._id},${field}`}>{occurrence[field]}</p>) }
                </>
            ))}
        </OccurrencesPanelContainer>
    )
}