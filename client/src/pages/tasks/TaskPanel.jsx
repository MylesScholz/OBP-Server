import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import styled from '@emotion/styled'
import axios from 'axios'

import SubtaskPipeline from './SubtaskPipeline'
import TaskMenu from './TaskMenu'
import TaskState from './TaskState'
import { useFlow } from '../../FlowProvider'

const TaskPanelContainer = styled.form`
    display: grid;
    grid-template-columns: 3fr 9fr;
    grid-column-gap: 10px;

    h1 {
        margin: 0px;

        font-size: 18pt;
    }
`

export default function TaskPanel() {
    const [ taskState, setTaskState ] = useState(new TaskState())
    const [ selectedTaskId, setSelectedTaskId ] = useState()
    const [ postTaskResponse, setPostTaskResponse ] = useState()
    const { query } = useFlow()

    // The URL or IP address of the backend server
    const serverAddress = `${import.meta.env.VITE_SERVER_HOST || 'localhost'}`

    /* Queries */

    /*
     * Selected Task Query
     * Fetches the task data for the currently selected task
     */
    const { error: selectedTaskQueryError, data: selectedTaskData } = useQuery({
        queryKey: ['selectedTask', selectedTaskId],
        queryFn: async () => {
            const queryUrl = `http://${serverAddress}/api/tasks/${selectedTaskId}`
            const response = await fetch(queryUrl)
            const selectedTaskResponse = await response.json()

            // Update taskState to match selected task's subtasks
            let newTaskState = new TaskState({ id: selectedTaskId })
            for (const subtask of (selectedTaskResponse?.task?.subtasks || [])) {
                newTaskState[subtask.type] = true
            }
            setTaskState(newTaskState)

            return { ...selectedTaskResponse, status: response.status, statusText: response.statusText }
        },
        refetchInterval: 1000,
        refetchOnMount: 'always',
        enabled: !!selectedTaskId
    })

    /* Handler Functions */

    /*
     * handleSubmit()
     * Posts a task to the server based on the form data
     */
    function handleSubmit(event) {
        event.preventDefault()

        // If there are no subtasks, return without posting
        if (taskState.areAllDisabled()) return

        // If there are subtasks with no valid input file post a warning
        const enabledSubtasks = taskState.getEnabledSubtasks()
        if (enabledSubtasks.some((type) => !event.target[`${type}Input`]?.value)) {
            console.error('Some subtasks have no valid input')
            window.alert('Some subtasks have no valid input')
            return
        }

        setPostTaskResponse(null)

        const formData = new FormData()

        // Add the upload file (if present)
        if (taskState.upload) {
            formData.append('file', taskState.upload)
        }

        // Build the subtask pipeline
        const subtaskPipeline = enabledSubtasks.map((type) => {
            const subtask = { type }

            // Subtask inputs are determined by the `${type}Input` element
            subtask.input = event.target[`${type}Input`]?.value

            if (subtask.input === 'selection') {
                subtask.query = query
            }

            // Add observations subtask settings
            if (type === 'observations') {
                subtask.sources = event.target.sources.value
                subtask.minDate = event.target.minDate.value
                subtask.maxDate = event.target.maxDate.value
            }

            return subtask
        })
        formData.append('subtasks', JSON.stringify(subtaskPipeline))

        // Post the task
        const requestUrl = `http://${serverAddress}/api/tasks`
        axios.postForm(requestUrl, formData).then((res) => {
            setPostTaskResponse({ status: res.status, data: res.data })

            const postedTaskId = res.data?.uri?.replace('/api/tasks/', '')
            setSelectedTaskId(postedTaskId)
        }).catch((error) => {
            setPostTaskResponse({ status: error.response?.status, error: error.response?.data?.error ?? error.message })
        })
    }

    return (
        <TaskPanelContainer onSubmit={ handleSubmit }>
            <TaskMenu
                taskState={taskState}
                setTaskState={setTaskState}
                selectedTaskId={selectedTaskId}
                setSelectedTaskId={setSelectedTaskId}
                selectedTaskQueryError={selectedTaskQueryError}
                selectedTaskData={selectedTaskData}
            />
            <SubtaskPipeline
                taskState={taskState}
                setTaskState={setTaskState}
                selectedTaskId={taskState.id}
                selectedTaskData={selectedTaskData}
            />
        </TaskPanelContainer>
    )
}