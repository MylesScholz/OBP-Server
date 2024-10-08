import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import styled from '@emotion/styled'

const TaskTrackerContainer = styled.div`
    display: flex;
    flex-grow: 1;
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

    p {
        margin: 0px;
    }
`

export default function TaskTracker({ queryResponse, result, setResult }) {
    const serverAddress = `${import.meta.env.VITE_SERVER_HOST || 'localhost'}`

    const { error: queryError, data: taskData } = useQuery({
        queryKey: ['taskData', queryResponse],
        queryFn: async () => {
            const queryURL = `http://${serverAddress}${queryResponse.data.uri}`
            const res = await fetch(queryURL)
            const resJSON = await res.json()

            setResult(resJSON?.task?.result)
            return resJSON
        },
        refetchInterval: 1000,
        enabled: !!queryResponse?.data?.uri && !result
    })

    const { data: downloadURL } = useQuery({
        queryKey: ['resultData', result],
        queryFn: async () => {
            const queryURL = `http://${serverAddress}${result.uri}`
            const res = await axios.get(queryURL, { responseType: 'blob' })
            return URL.createObjectURL(res.data)
        },
        enabled: !!result
    })

    return (
        <TaskTrackerContainer>
            <h2>Task Tracker</h2>

            { queryResponse?.data?.error &&
                <p>Error: {queryResponse.status} {queryResponse.data.error}</p>
            }
            { queryError &&
                <p>Error: {queryError.message}</p>
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
                    { result && downloadURL &&
                        <a href={downloadURL} download={result.fileName}>Download Results</a>
                    }
                </>
            }
            { !queryResponse?.data?.error && !queryError && !taskData?.task &&
                <p>There is no task in progress. Use the task submission form to start one.</p>
            }
        </TaskTrackerContainer>
    )
}