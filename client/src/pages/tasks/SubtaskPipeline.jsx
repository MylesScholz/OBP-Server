import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import styled from '@emotion/styled'

import SubtaskCard from './SubtaskCard'
import { useAuth } from '../../AuthProvider'

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

            optgroup {
                font-style: normal;
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
    flex-wrap: wrap;
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

class SubtaskSwitches {
    constructor(subtaskSwitches) {
        this.occurrences = !!subtaskSwitches?.occurrences
        this.observations = !!subtaskSwitches?.observations
        this.emails = !!subtaskSwitches?.emails
        this.labels = !!subtaskSwitches?.labels
        this.addresses = !!subtaskSwitches?.addresses
        this.pivots = !!subtaskSwitches?.pivots
        this.subtasks = [ 'occurrences', 'observations', 'emails', 'labels', 'addresses', 'pivots' ]
        this.subtaskIO = {
            'occurrences': {
                inputs: [ 'occurrences' ],
                outputs: [ 'occurrences', 'duplicates' ]
            },
            'observations': {
                inputs: [ 'occurrences' ],
                outputs: [ 'occurrences', 'pulls', 'flags' ]
            },
            'emails': {
                inputs: [ 'flags' ],
                outputs: [ 'emails' ]
            },
            'labels': {
                inputs: [ 'occurrences', 'pulls' ],     // The first input file type will be treated as the default
                outputs: [ 'labels', 'flags' ]
            },
            'addresses': {
                inputs: [ 'occurrences', 'pulls' ],
                outputs: [ 'addresses' ]
            },
            'pivots': {
                inputs: [ 'occurrences', 'pulls' ],
                outputs: [ 'pivots' ]
            }
        }
    }

    getFirstSubtask() {
        for (const type of this.subtasks) {
            if (this[type]) {
                return type
            }
        }
    }

    getSubtaskOrdinal(subtaskType) {
        let i = 1
        for (const type of this.subtasks) {
            if (type === subtaskType) return i
            if (this[type]) i++
        }
    }

    getInputOptions(subtaskType) {
        const acceptedInputs = this.subtaskIO[subtaskType]?.inputs ?? []
        const availableOptions = []

        for (const type of this.getEnabledSubtasks()) {
            if (type === subtaskType) break

            const acceptedOutputs = this.subtaskIO[type].outputs.filter((output) => acceptedInputs.includes(output))

            for (const output of acceptedOutputs) {
                const subtaskIndex = (this.getSubtaskOrdinal(type) - 1)
                const key = `${subtaskIndex}_${output}`
                availableOptions.push({ subtask: type, subtaskIndex, output, key })
            }
        }

        // Find the default input for the given subtask (the last output file matching the first accepted input file type of this subtask)
        const defaultIndex = availableOptions.findLastIndex((option) => option.output === this.subtaskIO[subtaskType].inputs[0])
        if (defaultIndex !== -1) {
            availableOptions[defaultIndex].default = true
        }
        
        return availableOptions
    }

    getEnabledSubtasks() {
        return this.subtasks.filter((type) => !!this[type])
    }

    getDisabledSubtasks() {
        return this.subtasks.filter((type) => !this[type])
    }

    areAllEnabled() {
        return this.subtasks.every((type) => !!this[type])
    }

    areAllDisabled() {
        return this.subtasks.every((type) => !this[type])
    }    
}

export default function SubtaskPipeline() {
    const { loggedIn } = useAuth()
    const [ postTaskResponse, setPostTaskResponse ] = useState()
    const [ selectedTaskId, setSelectedTaskId ] = useState()
    const [ file, setFile ] = useState()
    const [ subtaskSwitches, setSubtaskSwitches ] = useState(new SubtaskSwitches())
    const [ hoveredFile, setHoveredFile ] = useState()

    // Subtask pipeline presets for creating new tasks
    const newTaskPresets = {
        'blank': {},
        'occurrences-observations': { occurrences: true, observations: true },
        'occurrences-observations-pivots': { occurrences: true, observations: true, pivots: true },
        'occurrences-observations-emails': { occurrences: true, observations: true, emails: true },
        'labels-addresses': { labels: true, addresses: true },
        'full': { occurrences: true, observations: true, labels: true, addresses: true, emails: true, pivots: true }
    }

    // The URL or IP address of the backend server
    const serverAddress = `${import.meta.env.VITE_SERVER_HOST || 'localhost'}`

    /* Queries */

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
            let newSwitches = new SubtaskSwitches()
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

    /* Handler Functions */

    /*
     * handleAdd()
     * Adds a subtask to the pipeline
     */
    function handleAdd(event) {
        const newSwitches = new SubtaskSwitches(subtaskSwitches)
        newSwitches[event.target.value] = true

        setSubtaskSwitches(newSwitches)

        event.target.value = ''
    }

    /*
     * handleRemove()
     * Removes a task from the pipeline
     */
    function handleRemove(subtask) {
        const newSwitches = new SubtaskSwitches(subtaskSwitches)
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
        if (subtaskSwitches.areAllDisabled()) return

        setPostTaskResponse(null)

        const formData = new FormData()

        // Add the upload file
        formData.append('file', file)

        // Build the subtask pipeline
        const enabledSubtasks = subtaskSwitches.getEnabledSubtasks()
        const subtaskPipeline = enabledSubtasks.map((type, i) => {
            const subtask = { type }

            // The first subtask always accepts the upload file
            // The rest are determined by the `${type}Input` element
            if (i === 0) {
                subtask.input = 'upload'
            } else {
                subtask.input = event.target[`${type}Input`]?.value ?? 'upload'
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
                    if (newTaskPresets[event.target.value]) {
                        setSelectedTaskId(null)
                        setSubtaskSwitches(new SubtaskSwitches(newTaskPresets[event.target.value]))
                    } else {
                        setSelectedTaskId(event.target.value)
                    }
                } }>
                    <optgroup label='New task presets'>
                        { Object.keys(newTaskPresets).map((preset) => <option key={preset} value={preset}>New {preset} task</option>) }
                    </optgroup>
                    <optgroup label='Previous tasks'>
                        { tasks?.map((task) => <option value={task._id} key={task._id} selected={task._id === selectedTaskId}>{task.name}</option>)}
                    </optgroup>
                </select>

                { selectedTaskQueryError &&
                    <p>Error: {selectedTaskQueryError.message}</p>
                }
                { selectedTaskData &&
                    <p>Task {selectedTaskData.task?._id}: {selectedTaskData.task?.status}</p>
                }
            </div>

            <SubtaskForm onSubmit={ handleSubmit }>
                { subtaskSwitches.subtasks.map((type) =>
                    ( subtaskSwitches[type] &&
                        <SubtaskCard
                            key={type}
                            type={type}
                            subtaskSwitches={subtaskSwitches}
                            formVisible={!selectedTaskId}
                            setFile={setFile}
                            handleRemove={handleRemove}
                            hoveredFile={hoveredFile}
                            setHoveredFile={setHoveredFile}
                            selectedTaskData={selectedTaskData}
                            downloads={downloads}
                        />
                    ))
                }
                { !selectedTaskId &&
                    <div id='subtaskFormButtonContainer'>
                        { !subtaskSwitches.areAllEnabled() &&
                            <select id='addSubtask' onChange={ handleAdd }>
                                <option value='' selected={true}>+</option>
                                {
                                    subtaskSwitches
                                        .getDisabledSubtasks()
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