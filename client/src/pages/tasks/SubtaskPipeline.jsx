import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import styled from '@emotion/styled'

import TaskState from './TaskState'
import SubtaskCard from './SubtaskCard'
import { useAuth } from '../../AuthProvider'

const SubtaskPipelineContainer = styled.div`
    display: flex;
    flex-direction: row;
    justify-content: start;
    align-items: stretch;
    gap: 10px;

    border: 1px solid #222;
    border-radius: 5px;

    padding: 15px;

    overflow: scroll;
`

export default function SubtaskPipeline({ taskState, setTaskState, selectedTaskId, selectedTaskData }) {
    const { loggedIn } = useAuth()
    const [ hoveredFile, setHoveredFile ] = useState()
    const scrollRef = useRef(null)

    // The URL or IP address of the backend server
    const serverAddress = `${import.meta.env.VITE_SERVER_HOST || 'localhost'}`

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

    useEffect(() => {
        const element = scrollRef.current
        if (!element) return

        const handleWheel = (event) => {
            event.preventDefault()

            const scrollAmount = event.deltaX !== 0 ? event.deltaX : event.deltaY

            element.scrollBy({
                left: scrollAmount * 4,
                behavior: 'smooth'
            })
        }

        element.addEventListener('wheel', handleWheel, { passive: false })

        return () => {
            element.removeEventListener('wheel', handleWheel)
        }
    }, [])

    return (
        <SubtaskPipelineContainer ref={scrollRef}>
            { taskState.getEnabledSubtasks().map((type) =>
                <SubtaskCard
                    key={type}
                    type={type}
                    taskState={taskState}
                    showForm={!selectedTaskId}
                    setUpload={(file) => {
                        const newTaskState = new TaskState(taskState)
                        newTaskState.upload = file
                        
                        setTaskState(newTaskState)
                    }}
                    hoveredFile={hoveredFile}
                    setHoveredFile={setHoveredFile}
                    selectedTaskData={selectedTaskData}
                    downloads={downloads}
                />
            )}
        </SubtaskPipelineContainer>
    )
}