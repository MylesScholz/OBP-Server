import styled from '@emotion/styled'
import axios from 'axios'

import Determinations from './Determinations.js'
import QueriedSelection from './QueriedSelection.jsx'
import { useFlow } from '../../FlowProvider'

const DeterminationsPanelContainer = styled.div`
    position: relative;

    display: grid;
    grid-template-columns: 1fr;
    grid-auto-rows: 22px;

    border: 1px solid #222;

    padding-right: 12px;

    height: 600px;

    overflow-x: hidden;
    overflow-y: scroll;

    .row {
        display: grid;
        grid-template-columns: 40px repeat(10, 1fr);
        grid-auto-rows: 22px;

        &.header {
            z-index: 1000;
            position: sticky;
            top: 0px;
        }

        p {
            margin: 0px;

            border: 1px solid #222;

            padding: 2px;

            font-size: 10pt;

            white-space: nowrap;

            background-color: white;
        }

        .field {
            background-color: #dfdfdf;
        }
    }
`

export default function DeterminationsPanel({ determinations, setDeterminations }) {
    const { query } = useFlow()

    determinations ??= new Determinations()

    /* Handler Functions */

    function handleFieldNumberChange(event) {
        // TODO: query API for matching occurrences and set determination fields
    }

    /* QueriedSelection Query Functions */

    /*
     * fieldNumberQuery()
     * Uses the /occurrences q query parameter to get field numbers matching a given query string
     */
    async function fieldNumberQuery(fieldNumber) {
        const url = new URL(`http://server/api/occurrences${query.searchParams}`)
        const params = url.searchParams
        params.set('page_size', 5000)
        params.set('q', fieldNumber)

        const response = await axios.get(url.pathname + url.search).catch((error) => console.error(error))

        const fieldNumbers = response?.data?.data?.map((occurrence) => occurrence['fieldNumber']) ?? []

        return fieldNumbers
    }

    // TODO: bee taxonomy query function
    
    return (
        <DeterminationsPanelContainer>
            <div className='row header'>
                <p className='field'>#</p>
                { determinations.fields.map((field) => <p className='field' key={field}>{field}</p>) }
            </div>
            { determinations.data.map((det) =>
                <div className='row' key={det['key']}>
                    <p>{det['key'] + 1}</p>
                    <QueriedSelection inputId={`fieldNumber${det['key']}`} queryFn={fieldNumberQuery} onChange={handleFieldNumberChange} />
                    <p>{det['sampleId']}</p>
                    <p>{det['specimenId']}</p>
                    <p>{det['verbatimEventDate']}</p>
                    <p>{det['url']}</p>
                    <QueriedSelection inputId={`familyVolDet${det['key']}`} />
                    <QueriedSelection inputId={`genusVolDet${det['key']}`} />
                    <QueriedSelection inputId={`speciesVolDet${det['key']}`} />
                    <QueriedSelection inputId={`sexVolDet${det['key']}`} />
                    <QueriedSelection inputId={`casteVolDet${det['key']}`} />
                </div>
            )}
        </DeterminationsPanelContainer>
    )
}