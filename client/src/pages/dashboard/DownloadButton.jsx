import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import styled from '@emotion/styled'
import axios from 'axios'

import downloadOffIcon from '/src/assets/download_off.svg'
import downloadIcon from '/src/assets/download.svg'
import downloadingIcon from '/src/assets/downloading.svg'
import csvIcon from '/src/assets/csv.svg'
import { useEffect } from 'react'
import { useAuth } from '../../AuthProvider'

const DownloadButtonContainer = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;

    border: 1px solid #222;
    border-radius: 5px;
    
    padding: 0px;

    background-color: white;

    &:hover {
        background-color: #efefef;
    }

    button {
        border: none;

        padding: 0px;

        background-color: transparent;
    }

    button, a {
        display: flex;
        justify-content: center;
        align-items: center;

        padding: 5px;

        img {
            width: 20px;
            height: 20px;
        }
    }

    .pendingDownload {
        cursor: wait;
    }

    .noDownload {
        cursor: not-allowed;
    }
`

export default function DownloadButton({ searchParams }) {
    const { loggedIn } = useAuth()
    const [ selectedTaskId, setSelectedTaskId ] = useState()

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

    // On remount, update subtasks based on the selected task data
    let subtasks = selectedTaskData?.task?.subtasks ?? []

    /*
     * Downloads Query
     * Generates download links for each output file in the currently selected task
     */
    const { data: downloads } = useQuery({
        queryKey: ['downloads', subtasks, loggedIn],
        queryFn: async () => {
            const downloads = []

            for (const subtask of subtasks) {
                const outputs = subtask.outputs ?? []
                for (const output of outputs) {
                    const response = await axios.get(output.uri, { responseType: 'blob' }).catch((error) => {
                        return { status: error.status }
                    })

                    const download = {
                        fileName: output.fileName,
                        type: output.type,
                        subtype: output.subtype,
                        subtask: subtask.type,
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
        enabled: subtasks.some((subtask) => !!subtask.outputs)
    })

    // Reset selectedTaskId when searchParams changes
    useEffect(() => {
        setSelectedTaskId(null)
    }, [searchParams])

    function handleClick(event) {
        event.preventDefault()

        // Query if no task is selected (i.e. not pending or downloaded)
        if (!selectedTaskId) {
            axios.get(`/api/occurrences/download${searchParams}`).then((res) => {
                // TODO: store res status and data for display
                const postedTaskId = res.data?.uri?.replace('/api/tasks/', '')
                setSelectedTaskId(postedTaskId)
            }).catch((error) => {
                console.error(error)
                // TODO: store error status and data for display
            })
        }
    }

    return (
        <DownloadButtonContainer>
            { downloads ? (
                <a href={downloads?.at(0)?.url} download={downloads?.at(0).fileName}>
                    <img src={csvIcon} alt='CSV' />
                </a>
            ) : (
                <button className={ `${selectedTaskId && !downloads ? 'pendingDownload' : ''}` } onClick={handleClick}>
                    { !selectedTaskId && <img src={downloadIcon} alt='Download' /> }
                    { selectedTaskId && !downloads && <img src={downloadingIcon} alt='Downloading...' /> }
                </button>
            )}
        </DownloadButtonContainer>
    )
}