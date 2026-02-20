import { useState } from 'react'
import styled from '@emotion/styled'

import DeterminationRow from './DeterminationRow.jsx'

const DeterminationsPanelContainer = styled.div`
    position: relative;

    display: grid;
    grid-template-columns: 40px repeat(10, 1fr);
    grid-auto-rows: 22px;

    border: 1px solid #222;

    padding-right: 12px;

    height: 600px;

    overflow-x: hidden;
    overflow-y: scroll;

    p {
        margin: 0px;

        border: 1px solid #222;

        padding: 2px;

        font-size: 10pt;

        white-space: nowrap;

        background-color: white;

        &.field {
            z-index: 1000;
            position: sticky;
            top: 0px;

            background-color: #dfdfdf;
        }
    }
`

export default function DeterminationsPanel({ disabled, unsubmitted, setUnsubmitted }) {
    const [ rows, setRows ] = useState(Array.from(Array(50).keys()))

    const fields = [
        'fieldNumber',
        'sampleId',
        'specimenId',
        'verbatimEventDate',
        'url',
        'familyVolDet',
        'genusVolDet',
        'speciesVolDet',
        'sexVolDet',
        'casteVolDet'
    ]
    
    // TODO: make DeterminationsPanelContainer into a fieldset and use disabled
    // TODO: 'Add rows' button at end of panel
    return (
        <DeterminationsPanelContainer>
            <p className='field'>#</p>
            { fields.map((field) => <p className='field' key={field}>{field}</p>) }
            { rows.map((row) =>
                <DeterminationRow
                    key={row}
                    row={row}
                    unsubmitted={unsubmitted}
                    setUnsubmitted={setUnsubmitted}
                />
            )}
        </DeterminationsPanelContainer>
    )
}