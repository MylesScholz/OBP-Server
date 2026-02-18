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

    .queriedOptions {
        z-index: 1000;

        position: absolute;
        top: 100%;
        left: 0px;

        display: none;

        margin: 0px;

        border: 1px solid gray;
        border-radius: 5px;

        padding: 3px;

        width: 100%;
        max-height: 300px;

        box-sizing: border-box;

        overflow-x: hidden;
        overflow-y: scroll;

        list-style-type: none;
        background-color: white;

        &.show {
            display: flex;
            flex-direction: column;
            align-items: stretch;
        }

        li {
            cursor: default;

            button {
                border: none;
                border-radius: 5px;

                padding: 3px 5px;

                width: 100%;

                text-align: start;
                
                background-color: white;

                &:hover {
                    background-color: #efefef;
                }
            }
        }
    }
`

export default function QueriedSelection({ inputId, queryFn, onChange = null }) {
    const [ showOptions, setShowOptions ] = useState(false)
    const [ timeoutId, setTimeoutId ] = useState()
    const [ options, setOptions ] = useState([])
    const [ value, setValue ] = useState('')

    // Milliseconds to wait before making a query
    const queryDelayMSec = 1000

    /* Handler Functions */

    function handleChange(event) {
        setValue(event.target.value)

        // Clear previous timeout
        clearTimeout(timeoutId)

        // Delay query to avoid spam
        const id = setTimeout(async () => {
            const response = await queryFn(event.target.value)

            setOptions(response ?? [])
        }, queryDelayMSec)
        setTimeoutId(id)

        if (onChange) onChange(event)
    }

    return (
        <QueriedSelectionContainer onClick={() => setShowOptions(!showOptions)}>
            <input
                id={inputId}
                type='text'
                value={value}
                autoComplete='off'
                onChange={(event) => handleChange(event)}
                onBlur={(event) => {
                    // This blur event precedes the click event of the queriedOptions,
                    // so only hide the options when clicking outside of the sibling queriedOptions element
                    const sibling = event?.target?.nextElementSibling
                    let originalTarget = event?.nativeEvent?.explicitOriginalTarget
                    // Select the parent element if #text was clicked
                    if (originalTarget.nodeName === '#text') originalTarget = originalTarget.parentElement
                    
                    if (sibling !== originalTarget?.closest('.queriedOptions')) {
                        setShowOptions(false)
                    }
                }}
                onKeyDown={(event) => { if (event.key === 'Enter') setShowOptions(!showOptions) }}
            />
            <ul className={`queriedOptions ${showOptions ? 'show' : ''}`}>
                { options.map((option) =>
                    <li key={option}>
                        <button
                            value={option}
                            onClick={(event) => handleChange(event)}
                        >{option}</button>
                    </li>
                )}
                { options.length === 0 &&
                    <li><button>No results</button></li>
                }
            </ul>
        </QueriedSelectionContainer>
    )
}