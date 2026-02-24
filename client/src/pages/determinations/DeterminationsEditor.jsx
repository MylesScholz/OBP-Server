import { useEffect, useState } from 'react'
import { useBlocker } from 'react-router'
import styled from '@emotion/styled'
import axios from 'axios'

import DeterminationsHeader from './DeterminationsHeader'
import DeterminationsPanel from './DeterminationsPanel'
import { useAuth } from '../../AuthProvider'

const DeterminationsEditorForm = styled.form`
    display: grid;
    grid-template-columns: 1fr;
    grid-template-rows: 55px 1fr;
    grid-column-gap: 15px;
    grid-row-gap: 15px;

    .navBlockBackground {
        z-index: 10000;
        
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
    const [ result, setResult ] = useState()
    const [ panelKey, setPanelKey ] = useState(0)
    const { setBlockLogOut } = useAuth()

    /* Blockers */
    
    // Block React Router navigation when there are unsubmitted changes
    const blocker = useBlocker(({ currentLocation, nextLocation }) => 
        unsubmitted && currentLocation.pathname !== nextLocation.pathname
    )

    /* Effects */

    // Use the browser's native modal to confirm that the user wants to reload the page or close the tab (when there are unsubmitted changes)
    useEffect(() => {
        const handleBeforeUnload = (event) => {
            if (unsubmitted) {
                event.preventDefault()
                event.returnValue = ''
            }
        }

        window.addEventListener('beforeunload', handleBeforeUnload)
        return () => window.removeEventListener('beforeunload', handleBeforeUnload)
    }, [!!unsubmitted])

    /* Handler Functions */

    function handleSubmit(event) {
        event?.preventDefault()
        setDisabled(true)

        // List of determinations to submit
        const determinations = []

        // Add each row with a defined '_id' value (hidden input) to the determinations list
        for (const element of event.target) {
            if (element.type === 'hidden' && element.value !== '' && !element.disabled) {
                const row = element.id.replace('_id', '')

                const determination = {
                    '_id': element.value,
                    'familyVolDet': event.target[`familyVolDet${row}`].value,
                    'genusVolDet': event.target[`genusVolDet${row}`].value,
                    'speciesVolDet': event.target[`speciesVolDet${row}`].value,
                    'sexVolDet': event.target[`sexVolDet${row}`].value,
                    'casteVolDet':event.target[`casteVolDet${row}`].value
                }

                determinations.push(determination)

                // Disable submitted determination fields to prevent further submissions
                event.target[`_id${row}`].disabled = true
                event.target[`fieldNumber${row}`].disabled = true
                event.target[`familyVolDet${row}`].disabled = true
                event.target[`genusVolDet${row}`].disabled = true
                event.target[`speciesVolDet${row}`].disabled = true
                event.target[`sexVolDet${row}`].disabled = true
                event.target[`casteVolDet${row}`].disabled = true
            }
        }

        axios.post('/api/occurrences', { occurrences: determinations }).then((res) => {
            setResult(res.data)

            setPanelKey(panelKey + 1)   // Clear panel
            setBlockLogOut(false)
            setUnsubmitted(0)
            setDisabled(false)
        }).catch((error) => {
            console.error(error)
            setResult(error)

            setDisabled(false)
        })
    }

    return (
        <DeterminationsEditorForm onSubmit={ handleSubmit }>
            <DeterminationsHeader
                disabled={disabled}
                unsubmitted={unsubmitted}
                result={result}
                onClear={() => {
                    setPanelKey(panelKey + 1)
                    setBlockLogOut(false)
                    setUnsubmitted(0)
                }}
            />
            <DeterminationsPanel
                key={panelKey}
                disabled={disabled}
                unsubmitted={unsubmitted}
                setUnsubmitted={(value) => {
                    setUnsubmitted(value)
                    setBlockLogOut(!!value)
                    setResult(null)
                }}
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