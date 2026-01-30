import { useState } from 'react'
import axios from 'axios'
import styled from '@emotion/styled'

const DeterminationsAccessFormContainer = styled.div`
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

    #determinationsQueryPanel {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;

        form {
            display: flex;
            flex-direction: column;
            flex-grow: 1;
            gap: 10px;

            fieldset {
                display: flex;
                flex-direction: column;
                gap: 10px;

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
            }
        }

        #determinationsQueryResults {
            display: flex;
            flex-direction: column;
            gap: 10px;

            border: 1px solid #222;
            border-radius: 5px;

            padding: 10px;

            p {
                margin: 0px;

                font-size: 12pt;
            }
        }
    }
`

export default function DeterminationsAccessForm() {
    const [ queryType, setQueryType ] = useState('get')
    const [ uploadFormat, setUploadFormat ] = useState('ecdysis')
    const [ disabled, setDisabled ] = useState(false)
    const [ queryResponse, setQueryResponse ] = useState()

    function handleSubmit(event) {
        event.preventDefault()

        setDisabled(true)
        setQueryResponse(undefined)

        if (queryType === 'get') {
            axios.get('/api/determinations', { responseType: 'blob' }).then((res) => {
                setDisabled(false)
                setQueryResponse({ status: res.status, data: URL.createObjectURL(res.data) })
            }).catch((err) => {
                setDisabled(false)
                setQueryResponse({ status: err.response?.status, error: err.response?.data?.error ?? err.message })
            })
        } else if (queryType === 'post') {
            const formData = new FormData()
            formData.append('file', event.target.determinationsFileUpload.files[0])
            formData.append('format', uploadFormat)

            axios.postForm('/api/determinations', formData).then((res) => {
                setDisabled(false)
                setQueryResponse({ status: res.status, data: res.data })
            }).catch((err) => {
                setDisabled(false)
                setQueryResponse({ status: err.response?.status, error: err.response?.data?.error ?? err.message })
            })
        }
    }

    return (
        <DeterminationsAccessFormContainer>
            <h2>Authoritative Determinations</h2>

            <div id='determinationsQueryPanel'>
                <form onSubmit={ handleSubmit }>
                    <fieldset disabled={disabled}>
                        <div>
                            <label htmlFor='determinationsQueryType'>Operation:</label>
                            <select id='determinationsQueryType' onChange={(event) => {
                                setQueryResponse(undefined)
                                setQueryType(event.target.value)
                            }}>
                                <option value='get' selected={queryType === 'get'}>Download</option>
                                <option value='post' selected={queryType === 'post'}>Upload</option>
                            </select>
                        </div>

                        { queryType === 'post' &&
                            <>
                                <div>
                                    <label htmlFor='determinationsUploadFormat'>Upload Format:</label>
                                    <select id='determinationsUploadFormat' onChange={(event) => setUploadFormat(event.target.value)}>
                                        <option value='ecdysis' selected={uploadFormat === 'ecdysis'}>Ecdysis</option>
                                        <option value='determinations' selected={uploadFormat === 'determinations'}>Determinations</option>
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor='determinationsFileUpload'>File:</label>
                                    <input
                                        type='file'
                                        accept='.csv'
                                        id='determinationsFileUpload'
                                        required
                                    />
                                </div>
                            </>
                        }

                        <input type='submit' value='Submit' />
                    </fieldset>
                </form>

                { queryResponse &&
                    <div id='determinationsQueryResults'>
                        { queryResponse.status === 200 && queryType === 'get' &&
                            <a href={queryResponse.data} download='determinations.csv'>Download Determinations Dataset</a>
                        }
                        { queryResponse.status === 200 && queryType === 'post' &&
                            <p>File uploaded successfully</p>
                        }
                        { queryResponse.error &&
                            <p>Error: {queryResponse.error}</p>
                        }
                    </div>
                }
            </div>
        </DeterminationsAccessFormContainer>
    )
}