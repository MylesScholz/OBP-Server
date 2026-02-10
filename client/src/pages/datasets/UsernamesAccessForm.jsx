import { useState } from 'react'
import axios from 'axios'
import styled from '@emotion/styled'

const UsernamesAccessFormContainer = styled.div`
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

    #usernamesQueryPanel {
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

                        border: 1px solid gray;
                        border-radius: 5px;

                        background-color: white;

                        &:hover {
                            background-color: #efefef;
                        }
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

        #usernamesQueryResults {
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

export default function UsernamesAccessForm() {
    const [ queryType, setQueryType ] = useState('get')
    const [ disabled, setDisabled ] = useState(false)
    const [ queryResponse, setQueryResponse ] = useState()

    function handleSubmit(event) {
        event.preventDefault()

        setDisabled(true)
        setQueryResponse(undefined)

        if (queryType === 'get') {
            axios.get('/api/usernames', { responseType: 'blob' }).then((res) => {
                setDisabled(false)
                setQueryResponse({ status: res.status, data: URL.createObjectURL(res.data) })
            }).catch((err) => {
                setDisabled(false)
                setQueryResponse({ status: err.response?.status, error: err.response?.data?.error ?? err.message })
            })
        } else if (queryType === 'post') {
            const formData = new FormData()
            formData.append('file', event.target.usernamesFileUpload.files[0])

            axios.postForm('/api/usernames', formData).then((res) => {
                setDisabled(false)
                setQueryResponse({ status: res.status, data: res.data })
            }).catch((err) => {
                setDisabled(false)
                setQueryResponse({ status: err.response?.status, error: err.response?.data?.error ?? err.message })
            })
        }
    }

    return (
        <UsernamesAccessFormContainer>
            <h2>Registered iNaturalist Usernames</h2>

            <div id='usernamesQueryPanel'>
                <form onSubmit={ handleSubmit }>
                    <fieldset disabled={disabled}>
                        <div>
                            <label htmlFor='usernamesQueryType'>Operation:</label>
                            <select id='usernamesQueryType' onChange={(event) => {
                                setQueryResponse(undefined)
                                setQueryType(event.target.value)
                            }}>
                                <option value='get' selected={queryType === 'get'}>Download</option>
                                <option value='post' selected={queryType === 'post'}>Upload</option>
                            </select>
                        </div>

                        { queryType === 'post' &&
                            <div>
                                <label htmlFor='usernamesFileUpload'>File:</label>
                                <input
                                    type='file'
                                    accept='.csv'
                                    id='usernamesFileUpload'
                                    required
                                />
                            </div>
                        }

                        <input type='submit' value='Submit' />
                    </fieldset>
                </form>

                { queryResponse &&
                    <div id='usernamesQueryResults'>
                        { queryResponse.status === 200 && queryType === 'get' &&
                            <a href={queryResponse.data} download='usernames.csv'>Download Usernames Dataset</a>
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
        </UsernamesAccessFormContainer>
    )
}