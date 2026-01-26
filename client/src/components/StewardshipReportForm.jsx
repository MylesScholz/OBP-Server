import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import styled from '@emotion/styled'

const StewardshipReportFormContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;

    border: 1px solid gray;
    border-radius: 5px;

    padding: 20px;

    min-width: 400px;

    h2 {
        margin: 0px;
        margin-bottom: 5px;

        font-size: 16pt;
    }

    #stewardshipReportQueryPanel {
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

                    select, input {
                        flex-grow: 1;
                    }
                }
            }
        }

        #stewardshipReportQueryResults {
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

export default function StewardshipReportForm() {
    const [ file, setFile ] = useState()
    const [ formDisabled, setFormDisabled ] = useState(false)
    const [ queryResponse, setQueryResponse ] = useState()
    const [ selectedTaskId, setSelectedTaskId ] = useState()

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
                    const response = await axios.get(output.uri, { responseType: 'blob' }).catch((error) => {
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

        const formData = new FormData()

        formData.append('file', file)

        const url = event.target.stewardshipReportUrl?.value ?? ''
        const subtasks = [ { type: 'stewardshipReport', input: 'upload', url } ]
        formData.append('subtasks', JSON.stringify(subtasks))

        axios.postForm('/api/tasks', formData).then((res) => {
            setFormDisabled(false)
            setQueryResponse({ status: res.status, data: res.data })

            const postedTaskId = res.data?.uri?.replace('/api/tasks/', '')
            setSelectedTaskId(postedTaskId)
        }).catch((err) => {
            setFormDisabled(false)
            setQueryResponse({ status: err.response?.status, error: err.response?.data?.error ?? err.message })
        })
    }

    return (
        <StewardshipReportFormContainer>
            <h2>Stewardship Report Script</h2>

            <div id='stewardshipReportQueryPanel'>
                <form onSubmit={ handleSubmit }>
                    <fieldset disabled={formDisabled}>
                        <div>
                            <label htmlFor='stewardshipReportFileUpload'>Melittoflora Dataset:</label>
                            <input
                                type='file'
                                accept='.csv'
                                id='stewardshipReportFileUpload'
                                required
                                onChange={ (event) => setFile(event.target.files[0]) }
                            />
                        </div>
                        <div>
                            <label htmlFor='stewardshipReportUrl'>URL:</label>
                            <input
                                type='url'
                                id='stewardshipReportUrl'
                                required
                            />
                        </div>

                        <input type='submit' value='Submit' />
                    </fieldset>
                </form>

                { queryResponse &&
                    <div id='stewardshipReportQueryResults'>
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
        </StewardshipReportFormContainer>
    )
}