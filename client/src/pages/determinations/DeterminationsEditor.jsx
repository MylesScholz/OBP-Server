import { useState } from 'react'
import styled from '@emotion/styled'

import DeterminationsHeader from './DeterminationsHeader'
import DeterminationsPanel from './DeterminationsPanel'
import Determinations from './Determinations.js'

const DeterminationsEditorForm = styled.form`
    display: grid;
    grid-template-columns: 1fr;
    grid-template-rows: 55px 1fr;
    grid-column-gap: 15px;
    grid-row-gap: 15px;
`

export default function DeterminationsEditor() {
    const [ disabled, setDisabled ] = useState(false)
    const [ determinations, setDeterminations ] = useState(new Determinations())

    /* Handler Functions */

    function handleSubmit(event) {
        event?.preventDefault()
    }

    return (
        <DeterminationsEditorForm onSubmit={ handleSubmit }>
            <DeterminationsHeader disabled={disabled} />
            <DeterminationsPanel determinations={determinations} setDeterminations={setDeterminations} />
        </DeterminationsEditorForm>
    )
}