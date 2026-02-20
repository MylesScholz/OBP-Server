import { useState } from 'react'
import { useBlocker } from 'react-router'
import styled from '@emotion/styled'

import DeterminationsHeader from './DeterminationsHeader'
import DeterminationsPanel from './DeterminationsPanel'

const DeterminationsEditorForm = styled.form`
    display: grid;
    grid-template-columns: 1fr;
    grid-template-rows: 55px 1fr;
    grid-column-gap: 15px;
    grid-row-gap: 15px;

    .navBlockBackground {
        position: fixed;
        top: 0;
        right: 0;
        bottom: 0;
        left: 0;

        display: flex;
        justify-content: center;
        align-items: center;

        background-color: rgba(0, 0, 0, 0.1);

        user-select: none;
        -webkit-user-select: none;

        .navBlockModal {
            display: grid;
            grid-template-columns: 1fr 1fr;
            grid-auto-rows: 1fr;
            grid-column-gap: 15px;
            grid-row-gap: 15px;

            border: 1px solid #222;
            border-radius: 5px;

            padding: 20px;

            background-color: white;

            p {
                grid-column: 1 / 3;

                margin: 0px;

                font-size: 12pt;

                text-align: center;
            }

            button {
                border: 1px solid gray;
                border-radius: 5px;

                padding: 5px;

                background-color: white;

                &:hover {
                    background-color: #efefef;
                }
            }
        }
    }
`

export default function DeterminationsEditor() {
    const [ disabled, setDisabled ] = useState(false)
    const [ unsubmitted, setUnsubmitted ] = useState(0)

    /* Blockers */

    const blocker = useBlocker(({ currentLocation, nextLocation }) => 
        unsubmitted && currentLocation.pathname !== nextLocation.pathname
    )

    /* Handler Functions */

    function handleSubmit(event) {
        event?.preventDefault()

        // TODO: submit determination changes
    }

    return (
        <DeterminationsEditorForm onSubmit={ handleSubmit }>
            <DeterminationsHeader
                disabled={disabled}
                unsubmitted={unsubmitted}
            />
            <DeterminationsPanel
                disabled={disabled}
                unsubmitted={unsubmitted}
                setUnsubmitted={setUnsubmitted}
            />
            { blocker.state === 'blocked' &&
                <div className='navBlockBackground'>
                    <div className='navBlockModal'>
                        <p>You have unsubmitted changes. Are you sure you want to leave?</p>
                        <button onClick={() => blocker.proceed()}>Leave</button>
                        <button onClick={() => blocker.reset()}>Stay</button>
                    </div>
                </div>
            }
        </DeterminationsEditorForm>
    )
}