import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import styled from '@emotion/styled'

const PlantListAccessFormContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;

    border: 1px solid gray;
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
                    }
                }
            }
        }

        #plantListQueryResults {
            display: flex;
            flex-direction: column;
            gap: 10px;

            border: 1px solid gray;
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
    const [ file, setFile ] = useState()
    const [ formDisabled, setFormDisabled ] = useState(false)
    const [ queryResponse, setQueryResponse ] = useState()
    const [ selectedTaskId, setSelectedTaskId ] = useState()

    const serverAddress = `${import.meta.env.VITE_SERVER_HOST || 'localhost'}`

    /* Queries */

    /*
     * Selected Task Query
     * Fetches the task data for the currently selected task
     */
    const { error: selectedTaskQueryError, data: selectedTaskData } = useQuery({
        queryKey: ['selectedTask', selectedTaskId],
        queryFn: async () => {
            const queryURL = `http://${serverAddress}/api/tasks/${selectedTaskId}`
            const response = await fetch(queryURL)
            const selectedTaskResponse = await response.json()

            return { ...selectedTaskResponse, status: response.status, statusText: response.statusText }
        },
        refetchInterval: 1000,
        refetchOnMount: 'always',
        enabled: !!selectedTaskId
    })

    // On remount, update result based on the selected task data
    let result = selectedTaskData?.task?.result

    /*
     * Downloads Query
     * Generates download links for each output file in the currently selected task
     */
    const { data: downloads } = useQuery({
        queryKey: ['downloads', result],
        queryFn: async () => {
            const downloads = []

            const subtaskOutputs = result?.subtaskOutputs || []
            for (const subtaskOutput of subtaskOutputs) {

                const outputs = subtaskOutput.outputs || []
                for (const output of outputs) {
                    const queryUrl = `http://${serverAddress}${output.uri}`
                    const response = await axios.get(queryUrl, { responseType: 'blob' }).catch((error) => {
                        return { status: error.status }
                    })

                    const download = {
                        fileName: output.fileName,
                        type: output.type,
                        subtype: output.subtype,
                        subtask: subtaskOutput.type,
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
        enabled: !!result
    })

    /* Handler Functions */
    
    /*
     * handleSubmit()
     * Queries the server based on the form data
     */
    function handleSubmit(event) {
        event.preventDefault()

        setFormDisabled(true)
        setQueryResponse(null)
        setSelectedTaskId(null)

        const plantListQueryUrl = `http://${serverAddress}/api/plantList`
        const plantListTaskUrl = `http://${serverAddress}/api/tasks`

        if (queryType === 'get') {
            axios.get(plantListQueryUrl, { responseType: 'blob' }).then((res) => {
                setFormDisabled(false)
                setQueryResponse({ status: res.status, data: URL.createObjectURL(res.data) })
            }).catch((err) => {
                setFormDisabled(false)
                setQueryResponse({ status: err.response?.status, error: err.response?.data?.error ?? err.message })
            })
        } else if (queryType === 'post') {
            const formData = new FormData()
            formData.append('file', file)

            axios.postForm(plantListQueryUrl, formData).then((res) => {
                setFormDisabled(false)
                setQueryResponse({ status: res.status, data: res.data })
            }).catch((err) => {
                setFormDisabled(false)
                setQueryResponse({ status: err.response?.status, error: err.response?.data?.error ?? err.message })
            })
        } else if (queryType === 'update') {
            const formData = new FormData()

            const url = event.target.plantListUrl?.value ?? ''
            const subtasks = [ { type: 'plantList', url } ]
            formData.append('subtasks', JSON.stringify(subtasks))

            axios.postForm(plantListTaskUrl, formData).then((res) => {
                setFormDisabled(false)
                setQueryResponse({ status: res.status, data: res.data })

                const postedTaskId = res.data?.uri?.replace('/api/tasks/', '')
                setSelectedTaskId(postedTaskId)
            }).catch((err) => {
                setFormDisabled(false)
                setQueryResponse({ status: err.response?.status, error: err.response?.data?.error ?? err.message })
            })
        }
    }

    return (
        <PlantListAccessFormContainer>
            <h2>Plant List Access</h2>

            <div id='plantListQueryPanel'>
                <form onSubmit={ handleSubmit }>
                    <fieldset disabled={formDisabled}>
                        <div>
                            <label for='plantListQueryType'>Operation:</label>
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
                                <label for='plantListFileUpload'>File:</label>
                                <input
                                    type='file'
                                    accept='.csv'
                                    id='plantListFileUpload'
                                    required
                                    onChange={ (event) => setFile(event.target.files[0]) }
                                />
                            </div>
                        }

                        { queryType === 'update' &&
                            <div>
                                <label for='plantListUrl'>iNaturalist Query URL:</label>
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
                        { selectedTaskData?.task &&
                            <>
                                { selectedTaskData.task.progress &&
                                    <>
                                        <p>Current Step: {selectedTaskData.task.progress.currentStep}</p>
                                        { selectedTaskData.task.progress.percentage && <p>{selectedTaskData.task.progress.percentage}</p> }
                                    </>
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
                        { queryResponse.error &&
                            <p>Error: {queryResponse.error}</p>
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