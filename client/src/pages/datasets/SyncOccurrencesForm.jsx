import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import styled from '@emotion/styled'

import { useAuth } from '../../AuthProvider'

const SyncOccurrencesFormContainer = styled.div`
    display: flex;
    flex-direction: column;
    align-items: start;
    gap: 10px;

    border: 1px solid #222;
    border-radius: 5px;

    padding: 20px;

    h2 {
        margin: 0px;
        margin-bottom: 5px;

        font-size: 16pt;
    }

    p {
        margin: 0px;

        font-size: 12pt;
    }

    #syncOccurrencesQueryForm {
        fieldset {
            display: flex;
            flex-direction: column;
            align-items: stretch;
            gap: 15px;

            margin: 0px;

            border: none;

            padding: 0px;

            #syncQuerySettings {
                display: flex;
                flex-direction: row;
                align-items: center;
                gap: 10px;
            }
        }
    }

    #syncQueryStatus {
        display: flex;
        flex-direction: column;
        align-items: stretch;
        gap: 15px;
    }
`

export default function SyncOccurrencesForm() {
    const [ syncQuery, setSyncQuery ] = useState({ operation: 'read', file: 'working' })
    const [ selectedTaskId, setSelectedTaskId ] = useState()

    /*
     * Selected Task Query
     * Fetches the task data for the currently selected task
     */
    const { error: selectedTaskQueryError, data: selectedTaskData } = useQuery({
        queryKey: ['selectedTask', selectedTaskId],
        queryFn: async () => {
            const response = await fetch(`/api/tasks/${selectedTaskId}`)
            const selectedTaskResponse = await response.json()

            return { ...selectedTaskResponse, status: response.status, statusText: response.statusText }
        },
        refetchInterval: 1000,
        refetchOnMount: 'always',
        enabled: !!selectedTaskId
    })

    /* Handler Functions */

    function handleSubmit(event) {
        event.preventDefault()

        axios.post(`/api/occurrences/${syncQuery.file}/${syncQuery.operation}`).then((res) => {
            // TODO: store res status and data for display
            const postedTaskId = res.data?.uri?.replace('/api/tasks/', '')
            setSelectedTaskId(postedTaskId)
        }).catch((error) => {
            // TODO: store error status and data for display
            console.error(error)
        })
    }

    function handleReset(event) {
        event.preventDefault()

        setSelectedTaskId(null)
    }

    return (
        <SyncOccurrencesFormContainer>
            <h2>Working and Backup Occurrences</h2>

            { !selectedTaskId ? (
                <form id='syncOccurrencesQueryForm' onSubmit={ handleSubmit }>
                    <fieldset>
                        <div id='syncQuerySettings'>
                            <select
                                id='syncOperation'
                                value={syncQuery.operation}
                                onChange={(event) => setSyncQuery({ ...syncQuery, operation: event.target.value })}
                            >
                                <option value='read'>Read</option>
                                <option value='write'>Write</option>
                            </select>

                            <p>{syncQuery.operation === 'read' ? 'from' : 'into'}</p>

                            <select
                                id='syncFile'
                                value={syncQuery.file}
                                onChange={(event) => setSyncQuery({ ...syncQuery, file: event.target.value })}
                            >
                                <option value='working'>Working Occurrences</option>
                                <option value='backup'>Backup Occurrences</option>
                            </select>

                            <p>
                                {syncQuery.operation === 'read' ? 'into ' : 'from '}
                                {syncQuery.file === 'working' ? 'the occurrence database' : 'the working occurrences file'}
                            </p>
                        </div>                        

                        <input type='submit' value='Submit' />
                    </fieldset>
                </form>
            ) : (
                <div id='syncQueryStatus'>
                    { selectedTaskData?.task &&
                        <>
                            <p>Status: {selectedTaskData?.task.status}</p>
                            { selectedTaskData.task.progress?.percentage &&
                                <p>{selectedTaskData.task.progress.percentage}</p>
                            }
                        </>
                    }
                    { selectedTaskData?.error &&
                        <p>Error: {selectedTaskData.status} {selectedTaskData.statusText}</p>
                    }
                    <button
                        id='resetButton'
                        disabled={selectedTaskData?.task?.status === 'Running'}
                        onClick={ handleReset }
                    >New Query</button>
                </div>
            )}
        </SyncOccurrencesFormContainer>
    )
}