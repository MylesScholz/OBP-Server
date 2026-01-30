import { useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import styled from '@emotion/styled'
import axios from 'axios'

import uploadIcon from '/src/assets/upload.svg'
import csvIcon from '/src/assets/csv.svg'
import { useFlow } from '../../FlowProvider'


const DashboardUploadPanelContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;

    border: 1px solid gray;

    padding: 10px;

    h3 {
        margin: 0px;

        font-size: 14pt;
    }

    #uploadFieldset {
        display: flex;
        flex-direction: column;
        gap: 10px;

        margin: 0px;

        border: none;

        padding: 0px;

        #fileUploadContainer {
            display: flex;
            justify-content: center;
            align-items: center;

            #fileUpload {
                display: flex;
                justify-content: center;
                align-items: center;

                border-radius: 5px;

                background-color: white;

                cursor: pointer;

                &:hover {
                    background-color: #efefef;
                }

                p {
                    margin: 0px 5px;

                    font-size: 10pt;

                    word-break: break-all;
                }

                img {
                    width: 40px;
                    height: 40px;
                }

                input[type='file'] {
                    display: none;
                }
            }
        }

        #uploadSettings {
            display: flex;
            flex-direction: column;
            align-items: stretch;
            gap: 5px;

            button {
                display: flex;
                flex-direction: row;
                justify-content: space-between;
                align-items: center;

                border: 1px solid gray;
                border-radius: 5px;

                padding: 5px;

                font-size: 10pt;

                background-color: white;

                &:hover {
                    background-color: #efefef;
                }
            }
        }
    }

    #uploadStatus {
        display: flex;
        flex-direction: column;
        align-items: stretch;
        gap: 10px;

        p {
            margin: 0px;

            font-size: 12pt;
        }
    }
`

export default function DashboardUploadPanel({ disabled }) {
    const [ selectedTaskId, setSelectedTaskId ] = useState()
    const [ uploadFile, setUploadFile ] = useState()
    const [ settings, setSettings ] = useState({ replace: false, upsert: true })
    const uploadInputRef = useRef()
    const { query, setQuery } = useFlow()

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

    /* Handler Functions */

    function toggleSetting(event, setting) {
        event.preventDefault()

        setSettings({ ...settings, [setting]: !settings[setting] })
    }

    function handleUpload(event) {
        event.preventDefault()

        // Return if no upload file has been provided
        if (!uploadFile) return

        const formData = new FormData()
        
        // Add the upload file
        formData.append('file', uploadFile)
        // Set the subtask pipeline
        const subtaskPipeline = [
            {
                type: 'upload',
                replace: settings.replace,
                upsert: settings.upsert
            }
        ]
        formData.append('subtasks', JSON.stringify(subtaskPipeline))

        // Post the task
        axios.postForm('/api/tasks', formData).then((res) => {
            const postedTaskId = res.data?.uri?.replace('/api/tasks/', '')
            setSelectedTaskId(postedTaskId)
        }).catch((error) => {
            console.error(error)
        }).finally(() => {
            setQuery({ ...query, unsubmitted: true })
        })
    }

    function handleReset(event) {
        event.preventDefault()

        setSelectedTaskId(null)
        setUploadFile(null)

        const uploadInputElement = uploadInputRef.current
        if (uploadInputElement) {
            uploadInputElement.value = ''
        }
    }

    return (
        <DashboardUploadPanelContainer>
            <h3>Upload Occurrences</h3>

            { !selectedTaskId ? (
                <fieldset id='uploadFieldset' disabled={disabled}>
                    <div id='fileUploadContainer'>
                        <label id='fileUpload'>
                            { uploadFile ? (
                                <>
                                    <img src={csvIcon} alt='Browse...' />
                                    <p>{uploadFile.name}</p>
                                </>
                            ) : (
                                <img src={uploadIcon} alt='Browse...' />
                            )}
                            <input
                                type='file'
                                accept='.csv'
                                ref={uploadInputRef}
                                onChange={(event) => setUploadFile(event.target.files[0])}
                            />
                        </label>
                    </div>      

                    <div id='uploadSettings'>
                        <button onClick={(event) => toggleSetting(event, 'replace')}>
                            Existing Records: { settings.replace ? 'Replace' : 'Update' }
                        </button>
                        <button onClick={(event) => toggleSetting(event, 'upsert')}>
                            Unmatched Records: { settings.upsert ? 'Insert' : 'Ignore' }
                        </button>
                    </div>

                    <button id='uploadButton' onClick={ handleUpload }>Start Upload</button>
                </fieldset>
            ) : (
                <div id='uploadStatus'>
                    { selectedTaskData?.task &&
                        <p>Upload Status: {selectedTaskData?.task.status}</p>
                    }
                    { selectedTaskData?.error &&
                        <p>Error: {selectedTaskData.status} {selectedTaskData.statusText}</p>
                    }
                    <button
                        id='resetButton'
                        disabled={selectedTaskData?.task?.status === 'Running'}
                        onClick={ handleReset }
                    >New Upload</button>
                </div>
            )} 
        </DashboardUploadPanelContainer>
    )
}