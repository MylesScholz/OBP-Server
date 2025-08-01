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

export default function TaskTracker({ queryResponse, result, setResult, setFormDisabled }) {
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
        },
        refetchOnMount: 'always',
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
        refetchInterval: (result ? false : 1000),
        refetchOnMount: 'always',
        enabled: !!selectedTaskId
    })

    const { data: downloads } = useQuery({
        queryKey: ['resultData', result],
        queryFn: async () => {
            const downloads = []
            for (const output of result.outputs) {
                const queryUrl = `http://${serverAddress}${output.uri}`
                const res = await axios.get(queryUrl, { responseType: 'blob' })

                downloads.push({
                    url: URL.createObjectURL(res.data),
                    fileName: output.fileName,
                    type: output.type
                })
            }
            
            return downloads
        },
        refetchOnMount: 'always',
        enabled: !!result
    })

    // console.log('queryResponse:', queryResponse)
    // console.log('tasksData:', tasksData)
    // console.log('selectedTaskData:', selectedTaskData)
    // console.log('downloadURL:', downloadURL)
    // console.log('selectedTaskId:', selectedTaskId)

    if (result || queryResponse?.error || selectedTaskData?.error || tasksQueryError || selectedTaskQueryError) {
        setFormDisabled(false)
    }

    return (
        <TaskTrackerContainer>
            <h2>Task Tracker</h2>

            { queryResponse?.error &&
                <p>Error: {queryResponse.status} {queryResponse.error}</p>
            }
            { selectedTaskData?.error &&
                <p>Error: {selectedTaskData.status} {selectedTaskData.statusText}</p>
            }
            { tasksQueryError &&
                <p>Error: {tasksQueryError.message}</p>
            }
            { selectedTaskQueryError &&
                <p>Error: {selectedTaskQueryError.message}</p>
            }
            <select onChange={ (event) => {
                setSelectedTaskId(event.target.value)
                setResult(undefined)
            } }>
                <option value='' disabled selected={!selectedTaskId}>Select a task...</option>
                { tasksData?.tasks && tasksData.tasks.map((t) => <option value={t._id} key={t._id} selected={t._id === selectedTaskId}>{t.name}</option>)}
            </select>
            { selectedTaskData?.task &&
                <>
                    <p>Task {selectedTaskData.task._id}: {selectedTaskData.task.status}</p>
                    { selectedTaskData.task.status === 'Running' &&
                        <>
                            <p>Current Step: {selectedTaskData.task.progress.currentStep}</p>
                            { selectedTaskData.task.progress.percentage && <p>{selectedTaskData.task.progress.percentage}</p> }
                        </>
                    }
                    { downloads &&
                        downloads.map((d) => <a href={d.url} download={d.fileName}>Download {d.type} file</a>)
                    }
                    { selectedTaskData.task.warnings?.map((warning) => <p>{warning}</p>) }
                </>
            }
            { !queryResponse?.error && !selectedTaskData?.error && !tasksQueryError && !selectedTaskQueryError && !selectedTaskData?.task &&
                <p>No task in progress. Use the task submission form to start one.</p>
            }
        </TaskTrackerContainer>
    )
}