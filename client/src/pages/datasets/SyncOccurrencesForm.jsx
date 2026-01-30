import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import styled from '@emotion/styled'

import { useFlow } from '../../FlowProvider'

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
    const [ syncQuery, setSyncQuery ] = useState({ operation: 'download', file: 'working' })
    const [ disabled, setDisabled ] = useState(false)
    const [ queryResponse, setQueryResponse ] = useState()
    const [ selectedTaskId, setSelectedTaskId ] = useState()
    const { query, setQuery } = useFlow()

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

        setDisabled(true)
        setQueryResponse(null)

        if (syncQuery.operation === 'download') {
            axios.get(`/api/occurrences/${syncQuery.file}`, { responseType: 'blob' }).then((res) => {
                setDisabled(false)
                setQueryResponse({ status: res.status, data: URL.createObjectURL(res.data) })
            }).catch((error) => {
                setDisabled(false)
                setQueryResponse({ status: error.response?.status, error: error.response?.data?.error ?? error.message })
                console.error(error)
            })
        } else {
            axios.post(`/api/occurrences/${syncQuery.file}/${syncQuery.operation}`).then((res) => {
                setDisabled(false)
                setQueryResponse({ status: res.status, data: res.data })

                const postedTaskId = res.data?.uri?.replace('/api/tasks/', '')
                setSelectedTaskId(postedTaskId)
            }).catch((error) => {
                setDisabled(false)
                setQueryResponse({ status: error.response?.status, error: error.response?.data?.error ?? error.message })
                console.error(error)
            }).finally(() => {
                if (syncQuery.operation === 'read' && syncQuery.file === 'working') {
                    setQuery({ ...query, unsubmitted: true })
                }
            })
        }
    }

    function handleReset(event) {
        event.preventDefault()

        setQueryResponse(null)
        setSelectedTaskId(null)
    }

    return (
        <SyncOccurrencesFormContainer>
            <h2>Working and Backup Occurrences</h2>

            { !queryResponse ? (
                <form id='syncOccurrencesQueryForm' onSubmit={ handleSubmit }>
                    <fieldset disabled={disabled}>
                        <div id='syncQuerySettings'>
                            <select
                                id='syncOperation'
                                value={syncQuery.operation}
                                onChange={(event) => setSyncQuery({ ...syncQuery, operation: event.target.value })}
                            >
                                <option value='download'>Download</option>
                                <option value='read'>Read</option>
                                <option value='write'>Write</option>
                            </select>

                            { syncQuery.operation === 'read' && <p>from</p> }
                            { syncQuery.operation === 'write' && <p>into</p> }

                            <select
                                id='syncFile'
                                value={syncQuery.file}
                                onChange={(event) => setSyncQuery({ ...syncQuery, file: event.target.value })}
                            >
                                <option value='working'>Working Occurrences</option>
                                <option value='backup'>Backup Occurrences</option>
                            </select>

                            { syncQuery.operation !== 'download' &&
                                <p>
                                    {syncQuery.operation === 'read' ? 'into ' : 'from '}
                                    {syncQuery.file === 'working' ? 'the occurrence database' : 'the working occurrences file'}
                                </p>
                            }
                            
                        </div>                        

                        <input type='submit' value='Submit' />
                    </fieldset>
                </form>
            ) : (
                <div id='syncQueryStatus'>
                    { queryResponse.status === 200 && syncQuery.operation === 'download' &&
                        <a href={queryResponse.data} download={`${syncQuery.file}Occurrences.csv`}>Download {syncQuery.file} occurrences file</a>
                    }
                    { queryResponse.error &&
                        <p>Error: {queryResponse.error}</p>
                    }
                    { selectedTaskData?.task &&
                        <>
                            { selectedTaskData?.task.status &&
                                <p>Status: {selectedTaskData?.task.status}</p>
                            }
                            { selectedTaskData.task.progress?.currentStep &&
                                <p>Current Step: {selectedTaskData.task.progress.currentStep}</p>
                            }
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