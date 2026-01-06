import { useState } from 'react'
import axios from 'axios'
import styled from '@emotion/styled'

const DeterminationsAccessFormContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;

    border: 1px solid gray;
    border-radius: 5px;

    padding: 20px;

    min-width: 400px;

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

            border: 1px solid gray;
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
    const [ file, setFile ] = useState()
    const [ formDisabled, setFormDisabled ] = useState(false)
    const [ queryResponse, setQueryResponse ] = useState()

    const serverAddress = `${import.meta.env.VITE_SERVER_HOST || 'localhost'}`

    function handleSubmit(event) {
        event.preventDefault()

        setFormDisabled(true)
        setQueryResponse(undefined)

        const queryURL = `http://${serverAddress}/api/determinations`

        if (queryType === 'get') {
            axios.get(queryURL, { responseType: 'blob' }).then((res) => {
                setFormDisabled(false)
                setQueryResponse({ status: res.status, data: URL.createObjectURL(res.data) })
            }).catch((err) => {
                setFormDisabled(false)
                setQueryResponse({ status: err.response?.status, error: err.response?.data?.error ?? err.message })
            })
        } else if (queryType === 'post') {
            const formData = new FormData()
            formData.append('file', file)
            formData.append('format', uploadFormat)

            axios.postForm(queryURL, formData).then((res) => {
                setFormDisabled(false)
                setQueryResponse({ status: res.status, data: res.data })
            }).catch((err) => {
                setFormDisabled(false)
                setQueryResponse({ status: err.response?.status, error: err.response?.data?.error ?? err.message })
            })
        }
    }

    return (
        <DeterminationsAccessFormContainer>
            <h2>Determinations Dataset Access</h2>

            <div id='determinationsQueryPanel'>
                <form onSubmit={ handleSubmit }>
                    <fieldset disabled={formDisabled}>
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
                                        onChange={ (event) => setFile(event.target.files[0]) }
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