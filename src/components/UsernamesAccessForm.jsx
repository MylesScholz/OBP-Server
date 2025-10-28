import { useState } from 'react'
import axios from 'axios'
import styled from '@emotion/styled'

const UsernamesAccessFormContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;

    border: 1px solid gray;
    border-radius: 5px;

    padding: 20px;

    width: 400px;

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
                    }
                }
            }
        }

        #usernamesQueryResults {
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

export default function UsernamesAccessForm() {
    const [ queryType, setQueryType ] = useState('get')
    const [ file, setFile ] = useState()
    const [ formDisabled, setFormDisabled ] = useState(false)
    const [ queryResponse, setQueryResponse ] = useState()

    const serverAddress = `${import.meta.env.VITE_SERVER_HOST || 'localhost'}`

    function handleSubmit(event) {
        event.preventDefault()

        setFormDisabled(true)
        setQueryResponse(undefined)

        const queryURL = `http://${serverAddress}/api/usernames`

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
        <UsernamesAccessFormContainer>
            <h2>Username Dataset Access</h2>

            <div id='usernamesQueryPanel'>
                <form onSubmit={ handleSubmit }>
                    <fieldset disabled={formDisabled}>
                        <div>
                            <label for='usernamesQueryType'>Operation:</label>
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
                                <label for='usernamesFileUpload'>File:</label>
                                <input
                                    type='file'
                                    accept='.csv'
                                    id='usernamesFileUpload'
                                    required
                                    onChange={ (event) => setFile(event.target.files[0]) }
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