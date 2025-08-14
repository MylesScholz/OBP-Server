import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import styled from '@emotion/styled'

import SubtaskCard from './SubtaskCard'

const SubtaskPipelineContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;

    #taskSelectionContainer {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 20px;

        select {
            flex-grow: 1;

            max-width: 50%;

            font-size: 12pt;

            option {
                font-size: 12pt;
            }
        }

        p {
            flex-grow: 1;

            margin: 0px;

            font-size: 12pt;
        }
    }
`

const SubtaskForm = styled.form`
    display: flex;
    flex-direction: row;
    justify-content: start;
    align-items: stretch;
    flex-grow: 1;
    gap: 10px;

    #subtaskFormButtonContainer {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 10px;

        #addSubtask {
            appearance: none;

            border: 1px solid gray;
            border-radius: 5px;

            margin: 0px;

            padding: 5px;

            width: 35px;
            height: 35px;

            font-size: 12pt;
            text-align: center;

            &:hover {
                background-color: lightgray;
            }

            &:focus {
                background-color: white;
            }
        }

        input {
            padding: 5px;

            height: 35px;

            font-size: 12pt;
        }
    }
`

export default function SubtaskPipeline({ loggedIn }) {
    const [ postTaskResponse, setPostTaskResponse ] = useState()
    const [ selectedTaskId, setSelectedTaskId ] = useState()
    const [ file, setFile ] = useState()

    const defaultSwitches = {
        'occurrences': false,
        'observations': false,
        'labels': false,
        'addresses': false,
        'emails': false,
        'pivots': false,
    }
    const [ subtaskSwitches, setSubtaskSwitches ] = useState(defaultSwitches)

    // The URL or IP address of the backend server
    const serverAddress = `${import.meta.env.VITE_SERVER_HOST || 'localhost'}`

    // On remount, find the first enabled subtask card
    let firstEnabledSubtask = ''
    for (const [ type, enabled ] of Object.entries(subtaskSwitches)) {
        if (enabled) {
            firstEnabledSubtask = type
            break
        }
    }

    /*
     * Tasks Query
     * Fetches a list of all existing tasks from the server
     */
    const { error: tasksQueryError, data: tasks } = useQuery({
        queryKey: ['tasks', postTaskResponse],
        queryFn: async () => {
            const queryURL = `http://${serverAddress}/api/tasks`
            const response = await fetch(queryURL)
            const parsedResponse = await response.json()

            return parsedResponse.tasks
        },
        refetchInterval: 10000,
        refetchOnMount: 'always',
    })

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

            // Update subtaskSwitches to match selected task's subtasks
            let newSwitches = {}
            Object.keys(subtaskSwitches).forEach((subtask) => newSwitches[subtask] = false)
            for (const subtask of (selectedTaskResponse?.task?.subtasks || [])) {
                newSwitches[subtask.type] = true
            }
            setSubtaskSwitches(newSwitches)

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
        queryKey: ['downloads', result, loggedIn],
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

    /*
     * handleAdd()
     * Adds a subtask to the pipeline
     */
    function handleAdd(event) {
        const newSwitches = { ...subtaskSwitches }
        newSwitches[event.target.value] = true

        setSubtaskSwitches(newSwitches)

        event.target.value = ''
    }

    /*
     * handleRemove()
     * Removes a task from the pipeline
     */
    function handleRemove(subtask) {
        const newSwitches = { ...subtaskSwitches }
        newSwitches[subtask] = false

        setSubtaskSwitches(newSwitches)
    }

    /*
     * handleSubmit()
     * Posts a task to the server based on the form data
     */
    function handleSubmit(event) {
        event.preventDefault()

        // If there are no subtasks, return without posting
        if (!firstEnabledSubtask) return

        setPostTaskResponse(null)

        const formData = new FormData()

        // Add the upload file
        formData.append('file', file)

        // Build the subtask pipeline
        const subtaskPipeline = []
        for (const [ type, enabled ] of Object.entries(subtaskSwitches)) {
            if (enabled) {
                const subtask = { type }
                if (type === 'observations') {
                    subtask.sources = event.target.sources.value
                    subtask.minDate = event.target.minDate.value
                    subtask.maxDate = event.target.maxDate.value
                }

                subtaskPipeline.push(subtask)
            }
        }
        formData.append('subtasks', JSON.stringify(subtaskPipeline))

        // Post the task
        const requestURL = `http://${serverAddress}/api/tasks`
        axios.postForm(requestURL, formData).then((res) => {
            setPostTaskResponse({ status: res.status, data: res.data })

            const postedTaskId = res.data?.uri?.replace('/api/tasks/', '')
            setSelectedTaskId(postedTaskId)
        }).catch((error) => {
            setPostTaskResponse({ status: error.response?.status, error: error.response?.data?.error ?? error.message })
        })
    }

    return (
        <SubtaskPipelineContainer>
            <div id='taskSelectionContainer'>
                <select onChange={ (event) => {
                    setSelectedTaskId(event.target.value)
                    if (event.target.value === '') {
                        setSubtaskSwitches(defaultSwitches)
                    }
                } }>
                    <option value='' selected={!selectedTaskId}>Create a new task...</option>
                    { tasks?.map((task) => <option value={task._id} key={task._id} selected={task._id === selectedTaskId}>{task.name}</option>)}
                </select>

                { selectedTaskQueryError &&
                    <p>Error: {selectedTaskQueryError.message}</p>
                }
                { selectedTaskData &&
                    <p>Task {selectedTaskData.task?._id}: {selectedTaskData.task?.status}</p>
                }
            </div>

            <SubtaskForm onSubmit={ handleSubmit }>
                { Object.keys(subtaskSwitches).map((type) =>
                    ( subtaskSwitches[type] &&
                        <SubtaskCard
                            key={type}
                            type={type}
                            formVisible={!selectedTaskId}
                            setFile={firstEnabledSubtask === type ? setFile : undefined }
                            handleRemove={handleRemove}
                            selectedTaskData={selectedTaskData}
                            downloads={downloads}
                        />
                    ))
                }
                { !selectedTaskId &&
                    <div id='subtaskFormButtonContainer'>
                        { !Object.keys(subtaskSwitches).every((subtask) => subtaskSwitches[subtask]) &&
                            <select id='addSubtask' onChange={ handleAdd }>
                                <option value='' selected={true}>+</option>
                                {
                                    Object.keys(subtaskSwitches)
                                        .filter((subtask) => !subtaskSwitches[subtask])
                                        .map((subtask) => <option key={subtask} value={subtask}>{subtask}</option>)
                                }
                            </select>
                        }
                        <input type='submit' value='Submit' />
                    </div>
                }
            </SubtaskForm>
        </SubtaskPipelineContainer>
    )
}