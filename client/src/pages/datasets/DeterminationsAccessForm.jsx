import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import styled from '@emotion/styled'

import { useAuth } from '../../AuthProvider'

const DeterminationsAccessFormContainer = styled.div`
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

    select {
        border: 1px solid gray;
        border-radius: 5px;

        font-size: 10pt;

        background-color: white;

        &:hover {
            background-color: #efefef;
        }
    }

    button {
        border: 1px solid gray;
        border-radius: 5px;

        font-size: 10pt;

        background-color: white;

        &:hover {
            background-color: #efefef;
        }
    }

    form {
        fieldset {
            display: flex;
            flex-direction: column;
            gap: 15px;

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

    #determinationsQueryResults {
        display: flex;
        flex-direction: column;
        gap: 15px;

        p {
            margin: 0px;

            font-size: 12pt;
        }
    }
`

export default function DeterminationsAccessForm() {
    const [ queryType, setQueryType ] = useState('get')
    const [ uploadFormat, setUploadFormat ] = useState('ecdysis')
    const [ disabled, setDisabled ] = useState(false)
    const [ queryResponse, setQueryResponse ] = useState()
    const [ selectedTaskId, setSelectedTaskId ] = useState()
    const { admin } = useAuth()

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
        queryKey: ['downloads', subtasks, admin],
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

    function handleSubmit(event) {
        event.preventDefault()

        setDisabled(true)
        setQueryResponse(null)
        setSelectedTaskId(null)

        if (queryType === 'get') {
            axios.get('/api/determinations', { responseType: 'blob' }).then((res) => {
                setDisabled(false)
                setQueryResponse({ status: res.status, data: URL.createObjectURL(res.data) })
            }).catch((err) => {
                setDisabled(false)
                setQueryResponse({ status: err.response?.status, error: err.response?.data?.error ?? err.message })
            })
        } else if (queryType === 'post') {
            const formData = new FormData()
            formData.append('file', event.target.determinationsFileUpload.files[0])
            formData.append('format', uploadFormat)

            axios.postForm('/api/determinations', formData).then((res) => {
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

    function handleReset(event) {
        event.preventDefault()

        setQueryResponse(null)
        setSelectedTaskId(null)
    }

    return (
        <DeterminationsAccessFormContainer>
            <h2>Authoritative Determinations</h2>

            { !queryResponse ? (
                <form onSubmit={ handleSubmit }>
                    <fieldset disabled={disabled}>
                        <div>
                            <label htmlFor='determinationsQueryType'>Operation:</label>
                            <select id='determinationsQueryType' onChange={(event) => {
                                setQueryResponse(undefined)
                                setQueryType(event.target.value)
                            }}>
                                <option value='get' selected={queryType === 'get'}>Download</option>
                                <option value='post' selected={queryType === 'post'}>Upload</option>
                            </select>
                        </div>

                        { queryType === 'post' &&
                            <>
                                <div>
                                    <label htmlFor='determinationsUploadFormat'>Upload Format:</label>
                                    <select id='determinationsUploadFormat' onChange={(event) => setUploadFormat(event.target.value)}>
                                        <option value='ecdysis' selected={uploadFormat === 'ecdysis'}>Ecdysis</option>
                                        <option value='determinations' selected={uploadFormat === 'determinations'}>Determinations</option>
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor='determinationsFileUpload'>File:</label>
                                    <input
                                        type='file'
                                        accept='.csv'
                                        id='determinationsFileUpload'
                                        required
                                    />
                                </div>
                            </>
                        }

                        <input type='submit' value='Submit' />
                    </fieldset>
                </form>
            ) : (
                <div id='determinationsQueryResults'>
                    { queryResponse.status === 200 && queryType === 'get' &&
                        <a href={queryResponse.data} download='determinations.csv'>Download Determinations Dataset</a>
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
                    <button
                        id='resetButton'
                        disabled={selectedTaskData?.task?.status === 'Running'}
                        onClick={ handleReset }
                    >New Query</button>
                </div>
            )}
        </DeterminationsAccessFormContainer>
    )
}