import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import styled from '@emotion/styled'

const ArchiveBrowserContainer = styled.div`
    display: flex;
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
`

export default function ArchiveBrowser() {
    const [ selectedFileType, setSelectedFileType ] = useState()
    const [ selectedFileURI, setSelectedFileURI ] = useState()

    const serverAddress = `${import.meta.env.VITE_SERVER_HOST || 'localhost'}`

    const { error: archiveQueryError, data: archiveData } = useQuery({
        queryKey: ['archiveData', selectedFileType],
        queryFn: async () => {
            const queryURL = `http://${serverAddress}/api/archive/${selectedFileType}`
            const res = await fetch(queryURL)
            const resJSON = await res.json()

            return resJSON
        },
        refetchOnMount: 'always',
        enabled: !!selectedFileType
    })

    let { data: downloadURL } = useQuery({
        queryKey: ['archiveFile', selectedFileURI],
        queryFn: async () => {
            const queryURL = `http://${serverAddress}${selectedFileURI}`
            const res = await axios.get(queryURL, { responseType: 'blob' })
            return URL.createObjectURL(res.data)
        },
        refetchOnMount: 'always',
        enabled: !!selectedFileURI
    })

    return (
        <ArchiveBrowserContainer>
            <h2>Archive Browser</h2>

            <select onChange={ (event) => {
                setSelectedFileType(event.target.value)
                setSelectedFileURI(undefined)
            } }>
                <option value='' disabled selected={!selectedFileType}>Select an archive file type...</option>
                <option value='uploads'>Uploads</option>
                <option value='observations'>Observations</option>
                <option value='labels'>Labels</option>
            </select>

            <select onChange={ (event) => {
                setSelectedFileURI(event.target.value)
                downloadURL = undefined
            } }>
                <option value='' disabled selected={!selectedFileURI}>Select an archive file...</option>
                {archiveData?.files && archiveData.files.map((f) => <option value={f.uri} key={f.fileName} selected={f.uri === selectedFileURI}>{f.fileName}</option>)}
            </select>

            { downloadURL &&
                <a href={downloadURL} download={selectedFileURI.substring(selectedFileURI.lastIndexOf('/') + 1)}>Download File</a>
            }
        </ArchiveBrowserContainer>
    )
}