import { useState } from 'react'
import styled from '@emotion/styled'

const QueriedSelectionContainer = styled.div`
    position: relative;

    display: flex;
    flex-direction: row;
    justify-content: stretch;

    border: 1px solid gray;
    border-radius: 0px;

    font-size: 12pt;

    input {
        border: none;

        width: 100%;
        box-sizing: border-box;
    }
`

export default function QueriedSelection({ inputId, value = '', setValue, queryFn, onChange = null }) {
    const [ timeoutId, setTimeoutId ] = useState()
    const [ options, setOptions ] = useState([])

    // Milliseconds to wait before making a query
    const queryDelayMSec = 200

    /* Handler Functions */

    async function queryOptions(value) {
        const response = await queryFn(value) ?? []

        // Don't update when the response matches the value exactly (to prevent UI flicker)
        if (!(response.length === 1 && response[0] === value)) {
            setOptions(response)
        }
    }

    function handleChange(event) {
        setValue(event.target.value)

        // Clear previous timeout
        clearTimeout(timeoutId)

        // Delay query to avoid spam
        const id = setTimeout(async () => {
            await queryOptions(event.target.value)

            if (onChange) onChange(event)
        }, queryDelayMSec)
        setTimeoutId(id)
    }

    return (
        <QueriedSelectionContainer>
            <input
                id={inputId}
                type='text'
                autoComplete='off'
                list={`${inputId}Options`}
                placeholder='Enter a query value...'
                value={value}
                onChange={(event) => handleChange(event)}
                onFocus={(event) => queryOptions(event.target.value)}
            />
            <datalist id={`${inputId}Options`}>
                { options.map((option) =>
                    <option key={option} value={option}>{option}</option>
                )}
                { options.length === 0 &&
                    <option value=''>No results</option>
                }
            </datalist>
        </QueriedSelectionContainer>
    )
}