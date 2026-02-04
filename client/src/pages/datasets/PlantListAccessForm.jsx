import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import styled from '@emotion/styled'

import { useAuth } from '../../AuthProvider'

const PlantListAccessFormContainer = styled.div`
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

    #plantListQueryPanel {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;

        form {
            display: flex;
            flex-direction: column;
            flex-grow: 1;
            gap: 10px;

            fieldset {
                display: flex;
                flex-direction: column;
                gap: 10px;

                margin: 0px;

                border: none;

                padding: 0px;

                font-size: 12pt;

                div {
                    display: flex;
                    justify-content: stretch;
                    align-items: center;
                    gap: 10px;

                    white-space: nowrap;

                    select {
                        flex-grow: 1;

                        border: 1px solid gray;
                        border-radius: 5px;

                        background-color: white;

                        &:hover {
                            background-color: #efefef;
                        }
                    }

                    input {
                        flex-grow: 1;
                    }

                    input[type='url'] {
                        border: 1px solid gray;
                        border-radius: 5px;

                        padding: 3px;
                    }
                }

                input[type='submit'] {
                    border: 1px solid gray;
                    border-radius: 5px;

                    background-color: white;

                    &:hover {
                        background-color: #efefef;
                    }
                }
            }
        }

        #plantListQueryResults {
            display: flex;
            flex-direction: column;
            gap: 10px;

            border: 1px solid #222;
            border-radius: 5px;

            padding: 10px;

            p {
                margin: 0px;

                font-size: 12pt;
            }
        }
    }
`

export default function PlantListAccessForm() {
    const [ queryType, setQueryType ] = useState('get')
    const [ disabled, setDisabled ] = useState(false)
    const [ queryResponse, setQueryResponse ] = useState()
    const [ selectedTaskId, setSelectedTaskId ] = useState()
    const { loggedIn } = useAuth()

    /* Queries */

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

    // On remount, update subtasks based on the selected task data
    let subtasks = selectedTaskData?.task?.subtasks ?? []

    /*
     * Downloads Query
     * Generates download links for each output file in the currently selected task
     */
    const { data: downloads } = useQuery({
        queryKey: ['downloads', subtasks, loggedIn],
        queryFn: async () => {
            const downloads = []

            for (const subtask of subtasks) {
                const outputs = subtask.outputs ?? []
                for (const output of outputs) {
                    const response = await axios.get(output.uri, { responseType: 'blob' }).catch((error) => {
                        return { status: error.status }
                    })

                    const download = {
                        fileName: output.fileName,
                        type: output.type,
                        subtype: output.subtype,
                        subtask: subtask.type,
                        responseStatus: response.status
                    }
                    if (response.status === 200) {
                        download.url = URL.createObjectURL(response.data)
                    }
                    downloads.push(download)
                }
            }
            
            return downloads
        },
        refetchOnMount: 'always',
        enabled: subtasks.some((subtask) => !!subtask.outputs)
    })

    /* Handler Functions */
    
    /*
     * handleSubmit()
     * Queries the server based on the form data
     */
    function handleSubmit(event) {
        event.preventDefault()

        setDisabled(true)
        setQueryResponse(null)
        setSelectedTaskId(null)

        if (queryType === 'get') {
            axios.get('/api/plantList', { responseType: 'blob' }).then((res) => {
                setDisabled(false)
                setQueryResponse({ status: res.status, data: URL.createObjectURL(res.data) })
            }).catch((err) => {
                setDisabled(false)
                setQueryResponse({ status: err.response?.status, error: err.response?.data?.error ?? err.message })
            })
        } else if (queryType === 'post') {
            const formData = new FormData()
            formData.append('file', event.target.plantListFileUpload.files[0])

            axios.postForm('/api/plantList', formData).then((res) => {
                setDisabled(false)
                setQueryResponse({ status: res.status, data: res.data })
            }).catch((err) => {
                setDisabled(false)
                setQueryResponse({ status: err.response?.status, error: err.response?.data?.error ?? err.message })
            })
        } else if (queryType === 'update') {
            const formData = new FormData()

            const url = event.target.plantListUrl?.value ?? ''
            const subtasks = [ { type: 'plantList', url } ]
            formData.append('subtasks', JSON.stringify(subtasks))

            axios.postForm('/api/tasks', formData).then((res) => {
                setDisabled(false)
                setQueryResponse({ status: res.status, data: res.data })

                const postedTaskId = res.data?.uri?.replace('/api/tasks/', '')
                setSelectedTaskId(postedTaskId)
            }).catch((err) => {
                setDisabled(false)
                setQueryResponse({ status: err.response?.status, error: err.response?.data?.error ?? err.message })
            })
        }
    }

    return (
        <PlantListAccessFormContainer>
            <h2>Oregon Plant List</h2>

            <div id='plantListQueryPanel'>
                <form onSubmit={ handleSubmit }>
                    <fieldset disabled={disabled}>
                        <div>
                            <label htmlFor='plantListQueryType'>Operation:</label>
                            <select id='plantListQueryType' onChange={(event) => {
                                setQueryResponse(undefined)
                                setQueryType(event.target.value)
                            }}>
                                <option value='get' selected={queryType === 'get'}>Download</option>
                                <option value='post' selected={queryType === 'post'}>Upload</option>
                                <option value='update' selected={queryType === 'update'}>Update</option>
                            </select>
                        </div>

                        { queryType === 'post' &&
                            <div>
                                <label htmlFor='plantListFileUpload'>File:</label>
                                <input
                                    type='file'
                                    accept='.csv'
                                    id='plantListFileUpload'
                                    required
                                />
                            </div>
                        }

                        { queryType === 'update' &&
                            <div>
                                <label htmlFor='plantListUrl'>URL:</label>
                                <input
                                    type='url'
                                    id='plantListUrl'
                                    required
                                />
                            </div>
                        }

                        <input type='submit' value='Submit' />
                    </fieldset>
                </form>

                { queryResponse &&
                    <div id='plantListQueryResults'>
                        { queryResponse.status === 200 && queryType === 'get' &&
                            <a href={queryResponse.data} download='plantList.csv'>Download Plant List</a>
                        }
                        { queryResponse.status === 200 && queryType === 'post' &&
                            <p>File uploaded successfully</p>
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
                                {
                                    downloads?.map((d) => {
                                        if (d.responseStatus === 200) {
                                            return <a href={d.url} download={d.fileName}>Download {d.type}{d.subtype ? ` (${d.subtype})` : ''} file</a>
                                        } else if (d.responseStatus === 401) {
                                            return <p className='authRequiredDownloadMessage'>Authentication Required</p>
                                        } else {
                                            return <p>Error {d.responseStatus}</p>
                                        }
                                    })
                                }
                            </>
                        }
                        { selectedTaskData?.error &&
                            <p>Error: {selectedTaskData.status} {selectedTaskData.statusText}</p>
                        }
                    </div>
                }
            </div>
        </PlantListAccessFormContainer>
    )
}