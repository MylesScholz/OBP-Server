import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import styled from '@emotion/styled'

const ArchiveBrowserContainer = styled.div`
    display: flex;
    flex-direction: column;
    align-items: start;
    gap: 10px;

    border: 1px solid #222;
    border-radius: 5px;

    padding: 20px;

    min-width: 400px;

    h2 {
        margin: 0px;
        margin-bottom: 5px;

        font-size: 16pt;
    }

    div {
        display: flex;
        flex-direction: row;
        justify-content: stretch;
        gap: 10px;

        select {
            flex-grow: 1;
        }
    }
`

export default function ArchiveBrowser() {
    const [ selectedFileType, setSelectedFileType ] = useState()
    const [ selectedFileUri, setSelectedFileUri ] = useState()

    const { error: archiveQueryError, data: archiveData } = useQuery({
        queryKey: ['archiveData', selectedFileType],
        queryFn: async () => {
            const res = await fetch(`/api/archive/${selectedFileType}`)
            const resJSON = await res.json()

            return resJSON
        },
        refetchInterval: selectedFileType ? 1000 : false,
        refetchOnMount: 'always',
        enabled: !!selectedFileType
    })

    let { data: downloadURL } = useQuery({
        queryKey: ['archiveFile', selectedFileUri],
        queryFn: async () => {
            const res = await axios.get(`${selectedFileUri}`, { responseType: 'blob' })
            return URL.createObjectURL(res.data)
        },
        refetchOnMount: 'always',
        enabled: !!selectedFileUri
    })

    return (
        <ArchiveBrowserContainer>
            <h2>Archive Browser</h2>

            <div>
                <label htmlFor='archiveFileTypeSelect'>File Type:</label>
                <select id='archiveFileTypeSelect' onChange={ (event) => {
                    setSelectedFileType(event.target.value)
                    setSelectedFileUri(undefined)
                } }>
                    <option value='' disabled selected={!selectedFileType}>Select an archive file type...</option>
                    <option value='addresses'>Addresses</option>
                    <option value='backups'>Backups</option>
                    <option value='duplicates'>Duplicates</option>
                    <option value='emails'>Emails</option>
                    <option value='flags'>Flags</option>
                    <option value='labels'>Labels</option>
                    <option value='observations'>Observations</option>
                    <option value='occurrences'>Occurrences</option>
                    <option value='pivots'>Pivots</option>
                    <option value='pulls'>Pulls</option>
                    <option value='reports'>Reports</option>
                    <option value='uploads'>Uploads</option>
                </select>
            </div>            

            { selectedFileType &&
                <div>
                    <label htmlFor='archiveFileSelect'>File:</label>
                    <select id='archiveFileSelect' onChange={ (event) => {
                        setSelectedFileUri(event.target.value)
                        downloadURL = undefined
                    } }>
                        <option value='' disabled selected={!selectedFileUri}>Select an archive file...</option>
                        {archiveData?.files && archiveData.files.map((f) => <option value={f.uri} key={f.fileName} selected={f.uri === selectedFileUri}>{f.fileName}</option>)}
                    </select>
                </div>
            }

            { downloadURL &&
                <a href={downloadURL} download={selectedFileUri.substring(selectedFileUri.lastIndexOf('/') + 1)}>Download File</a>
            }
        </ArchiveBrowserContainer>
    )
}