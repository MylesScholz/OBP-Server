import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import styled from '@emotion/styled'

const TaskTrackerContainer = styled.div``

export default function TaskTracker({ queryResponse }) {
    const [ result, setResult ] = useState()

    const serverAddress = `${import.meta.env.VITE_SERVER_HOST || 'localhost'}`

    const { error, data: taskData } = useQuery({
        queryKey: ['taskData', queryResponse],
        queryFn: async () => {
            const queryURL = `http://${serverAddress}${queryResponse.data.uri}`
            const res = await fetch(queryURL)
            const resJSON = await res.json()

            setResult(resJSON?.task?.result)
            return resJSON
        },
        refetchInterval: 1000,
        enabled: !!queryResponse.data?.uri && !result
    })

    const { data: downloadURL } = useQuery({
        queryKey: ['resultData'],
        queryFn: async () => {
            const queryURL = `http://${serverAddress}${result.uri}`
            const res = await axios.get(queryURL, { responseType: 'blob' })
            return URL.createObjectURL(res.data)
        },
        enabled: !!result
    })

    return (
        <TaskTrackerContainer>
            { queryResponse.data.error &&
                <p>Error: {queryResponse.status} {queryResponse.data.error}</p>
            }
            { error &&
                <p>Error: {error.message}</p>
            }
            { taskData?.task &&
                <>
                    <p>Task {taskData.task._id}: {taskData.task.status}</p>
                    { taskData.task.status === 'Running' &&
                        <>
                            <p>Current Step: {taskData.task.progress.currentStep}</p>
                            { taskData.task.progress.percentage && <p>{taskData.task.progress.percentage}</p> }
                        </>
                    }
                    { downloadURL &&
                        <a href={downloadURL} download={result.fileName}>Download Results</a>
                    }
                </>
            }
        </TaskTrackerContainer>
    )
}