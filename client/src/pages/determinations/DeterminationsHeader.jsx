import { useRef } from 'react'
import styled from '@emotion/styled'

const DeterminationsHeaderContainer = styled.fieldset`
    display: flex;
    flex-direction: row;
    justify-content: space-between;
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

        color: dodgerblue;
    }

    #determinationsHeaderRight {
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
        gap: 15px;

        #determinationsSubmitButton {
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
    }
`

export default function DeterminationsHeader({ disabled, unsubmitted }) {
    const submitRef = useRef()

    return (
        <DeterminationsHeaderContainer disabled={disabled}>
            <div id='determinationsHeaderRight'>
                { !!unsubmitted &&
                    <p>{unsubmitted.toLocaleString('en-US')} unsubmitted changes pending...</p>
                }
                <button
                    id='determinationsSubmitButton'
                    type='submit'
                    ref={submitRef}
                >Submit</button>
            </div>
        </DeterminationsHeaderContainer>
    )
}