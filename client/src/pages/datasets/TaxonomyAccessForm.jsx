import { useState } from 'react'
import axios from 'axios'
import styled from '@emotion/styled'
import { useQuery } from '@tanstack/react-query'

const TaxonomyAccessFormContainer = styled.div`
    display: flex;
    flex-direction: column;
    align-items: start;
    gap: 10px;

    border: 1px solid #222;
    border-radius: 5px;

    padding: 20px;

    h2 {
        margin: 0px;
        margin-bottom: 5px;

        font-size: 16pt;
    }

    p {
        margin: 0px;

        font-size: 12pt;
    }

    select {
        border: 1px solid gray;
        border-radius: 5px;

        font-size: 10pt;

        background-color: white;

        &:hover {
            background-color: #efefef;
        }
    }

    button {
        border: 1px solid gray;
        border-radius: 5px;

        font-size: 10pt;

        background-color: white;

        &:hover {
            background-color: #efefef;
        }
    }

    form {
        fieldset {
            display: flex;
            flex-direction: column;
            gap: 15px;

            margin: 0px;

            border: none;

            padding: 0px;

            font-size: 12pt;

            div {
                display: flex;
                justify-content: stretch;
                align-items: center;
                gap: 10px;

                white-space: nowrap;

                select {
                    flex-grow: 1;
                }
            }

            input[type='submit'] {
                border: 1px solid gray;
                border-radius: 5px;

                background-color: white;

                &:hover {
                    background-color: #efefef;
                }
            }
        }
    }

    #taxonomyQueryResults {
        display: flex;
        flex-direction: column;
        gap: 15px;
    }
`

export default function TaxonomyAccessForm() {
    const [ operation, setOperation ] = useState('download')
    const [ disabled, setDisabled ] = useState(false)
    const [ queryResponse, setQueryResponse ] = useState()

    /* Queries */

    /*
     * Downloads Query
     * Generates download links for the taxonomy and sex-caste files in the queryResponse
     */
    const { data: downloads } = useQuery({
        queryKey: ['downloads', operation],
        queryFn: async () => {
            const downloads = []

            const { taxonomyFileName, taxonomyUri, sexCasteFileName, sexCasteUri } = queryResponse.data
            if (taxonomyUri) {
                const response = await axios.get(taxonomyUri, { responseType: 'blob' }).catch((error) => {
                    return { status: error.status }
                })

                const download = {
                    fileName: taxonomyFileName,
                    type: 'taxonomy',
                    responseStatus: response.status
                }
                if (response.status === 200) {
                    download.url = URL.createObjectURL(response.data)
                }
                downloads.push(download)
            }
            if (sexCasteUri) {
                const response = await axios.get(sexCasteUri, { responseType: 'blob' }).catch((error) => {
                    return { status: error.status }
                })

                const download = {
                    fileName: sexCasteFileName,
                    type: 'sexCaste',
                    responseStatus: response.status
                }
                if (response.status === 200) {
                    download.url = URL.createObjectURL(response.data)
                }
                downloads.push(download)
            }
            
            return downloads
        },
        refetchOnMount: 'always',
        enabled: !!(queryResponse?.data?.taxonomyUri || queryResponse?.data?.sexCasteUri)
    })

    /* Handler Functions */

    function handleSubmit(event) {
        event.preventDefault()
        setDisabled(true)

        if (operation === 'download') {
            axios.get('/api/taxonomy/download').then((res) => {
                setDisabled(false)
                setQueryResponse({ status: res.status, data: res.data })
            }).catch((error) => {
                setDisabled(false)
                setQueryResponse({ status: error.response?.status, error: error.response?.data?.error ?? error.message })
            })
        } else if (operation === 'upload') {
            const formData = new FormData()
            formData.append('file', event.target.taxonomyFileUpload.files[0])
            formData.append('type', event.target.taxonomyUploadType.value)

            axios.post('/api/taxonomy', formData).then((res) => {
                setDisabled(false)
                setQueryResponse({ status: res.status, data: res.data })
            }).catch((error) => {
                setDisabled(false)
                setQueryResponse({ status: error.response?.status, error: error.response?.data?.error ?? error.message })
            })
        }

        setDisabled(false)
    }

    function handleReset(event) {
        event.preventDefault()

        setQueryResponse(null)
    }

    return (
        <TaxonomyAccessFormContainer>
            <h2>Bee Taxonomy</h2>

            { !queryResponse ? (
                <form onSubmit={ handleSubmit }>
                    <fieldset disabled={disabled}>
                        <div>
                            <label htmlFor='taxonomyQueryType'>Operation:</label>
                            <select
                                id='taxonomyQueryType'
                                value={operation}
                                onChange={(event) => {
                                    setQueryResponse(undefined)
                                    setOperation(event.target.value)
                                }}
                            >
                                <option value='download'>Download</option>
                                <option value='upload'>Upload</option>
                            </select>
                        </div>

                        { operation === 'upload' &&
                            <>
                                <div>
                                    <label htmlFor='taxonomyUploadType'>Upload Type:</label>
                                    <select id='taxonomyUploadType'>
                                        <option value='taxonomy'>Taxonomy</option>
                                        <option value='sexCaste'>Sex-Caste</option>
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor='taxonomyFileUpload'>File:</label>
                                    <input
                                        type='file'
                                        accept='.csv'
                                        id='taxonomyFileUpload'
                                        required
                                    />
                                </div>
                            </>
                        }

                        <input type='submit' value='Submit' />
                    </fieldset>
                </form>
            ) : (
                <div id='taxonomyQueryResults'>
                    { downloads?.map((download) => {
                        if (download.responseStatus === 200) {
                            return <a href={download.url} download={download.fileName}>Download {download.type} file</a>
                        } else if (download.responseStatus === 401) {
                            return <p className='authRequiredDownloadMessage'>Authentication Required</p>
                        } else {
                            return <p>Error {download.responseStatus}</p>
                        }
                    })}
                    { queryResponse.status === 200 && operation === 'upload' &&
                        <p>File uploaded successfully</p>
                    }
                    { queryResponse.error &&
                        <p>Error: {queryResponse.error}</p>
                    }

                    <button
                        id='resetButton'
                        onClick={ handleReset }
                    >New Query</button>
                </div>
            )}
        </TaxonomyAccessFormContainer>
    )
}