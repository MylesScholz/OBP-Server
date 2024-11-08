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
    const [ selectedTaskId, setSelectedTaskId ] = useState()

    const serverAddress = `${import.meta.env.VITE_SERVER_HOST || 'localhost'}`

    const { error: tasksQueryError, data: tasksData } = useQuery({
        queryKey: ['tasksData', queryResponse],
        queryFn: async () => {
            const queryURL = `http://${serverAddress}/api/tasks`
            const res = await fetch(queryURL)
            const resJSON = await res.json()

            const queryResponseId = queryResponse?.data?.uri?.replace('/api/tasks/', '')
            setSelectedTaskId(queryResponseId)
            setResult(undefined)

            return resJSON
        }
    })

    const { error: selectedTaskQueryError, data: selectedTaskData } = useQuery({
        queryKey: ['selectedTaskData', selectedTaskId],
        queryFn: async () => {
            const queryURL = `http://${serverAddress}/api/tasks/${selectedTaskId}`
            const res = await fetch(queryURL)
            const resJSON = await res.json()

            setResult(resJSON?.task?.result)
            return { ...resJSON, status: res.status, statusText: res.statusText }
        },
        refetchInterval: 1000,
        enabled: !!selectedTaskId && !result
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
            { selectedTaskData?.error &&
                <p>Error {selectedTaskData.status}: {selectedTaskData.statusText}</p>
            }
            { tasksQueryError &&
                <p>Error: {tasksQueryError.message}</p>
            }
            { selectedTaskQueryError &&
                <p>Error: {selectedTaskQueryError.message}</p>
            }
            { tasksData?.tasks.length > 0 &&
                <select onChange={ (event) => {
                    setSelectedTaskId(event.target.value)
                    setResult(undefined)
                } }>
                    {tasksData.tasks.map((t) => <option value={t._id} key={t._id} selected={t._id === selectedTaskId}>Task {t._id} ({t.type})</option>)}
                </select>
            }
            { selectedTaskData?.task &&
                <>
                    <p>Task {selectedTaskData.task._id}: {selectedTaskData.task.status}</p>
                    { selectedTaskData.task.status === 'Running' &&
                        <>
                            <p>Current Step: {selectedTaskData.task.progress.currentStep}</p>
                            { selectedTaskData.task.progress.percentage && <p>{selectedTaskData.task.progress.percentage}</p> }
                        </>
                    }
                    { result && downloadURL &&
                        <a href={downloadURL} download={result.fileName}>Download Results</a>
                    }
                    { selectedTaskData.task.warning &&
                        <p>Warning: {selectedTaskData.task.warning.message}</p>
                    }
                </>
            }
            { !queryResponse?.data?.error && !selectedTaskData?.error && !tasksQueryError && !selectedTaskQueryError && !selectedTaskData?.task &&
                <p>There is no task in progress. Use the task submission form to start one.</p>
            }
        </TaskTrackerContainer>
    )
}