import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import styled from '@emotion/styled'
import axios from 'axios'

import downloadOffIcon from '/src/assets/download_off.svg'
import downloadIcon from '/src/assets/download.svg'
import downloadingIcon from '/src/assets/downloading.svg'
import csvIcon from '/src/assets/csv.svg'
import { useEffect } from 'react'

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

export default function DownloadButton({ queryUrl }) {
    const [ selectedTaskId, setSelectedTaskId ] = useState()

    // The URL or IP address of the backend server
    const serverAddress = `${import.meta.env.VITE_SERVER_HOST || 'localhost'}`

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
        queryKey: ['downloads', result],
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

    // Reset selectedTaskId when queryUrl changes
    useEffect(() => {
        setSelectedTaskId(null)
    }, [queryUrl])

    function handleClick(event) {
        event.preventDefault()

        // No button behavior if there is no queryUrl
        if (!queryUrl) return

        // Query URL exists, but no task (or downloads)
        if (queryUrl && !selectedTaskId) {
            const url = new URL(queryUrl)
            url.pathname = '/api/occurrences/download'

            axios.get(url.toString()).then((res) => {
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
                <button className={ `${!queryUrl && 'noDownload'} ${selectedTaskId && !downloads && 'pendingDownload'}` } onClick={handleClick}>
                    { !queryUrl && <img src={downloadOffIcon} alt='No download' /> }
                    { queryUrl && !selectedTaskId && <img src={downloadIcon} alt='Download' /> }
                    { selectedTaskId && !downloads && <img src={downloadingIcon} alt='Downloading...' /> }
                </button>
            )}
        </DownloadButtonContainer>
    )
}