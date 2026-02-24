import { useRef } from 'react'
import styled from '@emotion/styled'

const DeterminationsHeaderContainer = styled.fieldset`
    display: flex;
    flex-direction: row;
    justify-content: start;
    align-items: center;
    gap: 10px;

    border: 1px solid #222;
    border-radius: 5px;

    padding: 15px;

    margin: 0px;

    white-space: nowrap;

    p {
        margin: 0px;

        font-size: 12pt;

        font-weight: bold;

        &#unsubmittedMessage {
            color: dodgerblue;
        }
        
        &#resultMessage {
            color: limegreen;
        }
    }

    button {
        border: 1px solid gray;
        border-radius: 5px;

        padding: 5px;

        height: 32px;

        font-size: 10pt;

        background-color: white;

        &:hover {
            background-color: #efefef;
        }
    }
`

export default function DeterminationsHeader({ disabled, unsubmitted, result, onClear }) {
    const submitRef = useRef()

    return (
        <DeterminationsHeaderContainer disabled={disabled}>
            <button
                onClick={(event) => {
                    event.preventDefault()
                    onClear()
                }}
            >Clear</button>
            <button
                id='determinationsSubmitButton'
                type='submit'
                ref={submitRef}
            >Submit</button>
            { !!unsubmitted &&
                <p id='unsubmittedMessage'>{unsubmitted.toLocaleString('en-US')} unsubmitted changes pending...</p>
            }
            { result &&
                <p id='resultMessage'>{(result.matchedCount ?? 0).toLocaleString('en-US')} changes submitted</p>
            }
        </DeterminationsHeaderContainer>
    )
}