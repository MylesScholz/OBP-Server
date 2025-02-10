import { useState } from 'react'
import axios from 'axios'
import styled from '@emotion/styled'

const TaskQueryBuilderContainer = styled.div`
    display: flex;
    flex-grow: 1;

    border: 1px solid gray;
    border-radius: 5px;

    padding: 20px;

    form {
        display: flex;
        flex-grow: 1;
        flex-direction: column;

        h2 {
            margin: 0px;
            margin-bottom: 15px;

            font-size: 16pt;
        }

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
                gap: 10px;

                white-space: nowrap;
            }
        }
    }
`

export default function TaskQueryBuilder({ setQueryResponse, setResult, formDisabled, setFormDisabled }) {
    const [ taskType, setTaskType ] = useState('observations')
    const [ file, setFile ] = useState()
    const [ pullSources, setPullSources ] = useState('yes')

    const serverAddress = `${import.meta.env.VITE_SERVER_HOST || 'localhost'}`

    function handleSubmit(event) {
        event.preventDefault()

        setFormDisabled(true)
        setQueryResponse(undefined)
        setResult(undefined)

        const formData = new FormData()
        formData.append('file', file)
        if (taskType === 'observations' && pullSources === 'yes') {
            formData.append('sources', event.target.sources.value)
            formData.append('minDate', event.target.minDate.value)
            formData.append('maxDate', event.target.maxDate.value)
        }

        const requestURL = `http://${serverAddress}/api/tasks/${taskType}`
        axios.postForm(requestURL, formData).then((res) => {
            setQueryResponse({ status: res.status, data: res.data })
        }).catch((err) => {
            setQueryResponse({ status: err.response?.status, error: err.response?.data?.error ?? err.message })
        })
    }

    return (
        <TaskQueryBuilderContainer>
            <form onSubmit={ handleSubmit }>
                <h2>Task Submission Form</h2>

                <fieldset disabled={formDisabled}>
                    <div>
                        <label for='queryType'>Task Type:</label>
                        <select id='queryType' onChange={ (event) => setTaskType(event.target.value) }>
                            <option value='observations'>Format Observations</option>
                            <option value='labels'>Create Labels</option>
                        </select>
                    </div>
                    
                    { taskType === 'labels' &&
                        <div>
                            <label for='fileUpload'>File:</label>
                            <input
                                type='file'
                                accept='.csv'
                                id='fileUpload'
                                required
                                onChange={ (event) => setFile(event.target.files[0]) }
                            />
                        </div>
                    }

                    { taskType === 'observations' &&
                        <>
                            <div>
                                <label for='fileUpload'>File:</label>
                                <input
                                    type='file'
                                    accept='.csv'
                                    id='fileUpload'
                                    required
                                    onChange={ (event) => setFile(event.target.files[0]) }
                                />
                            </div>

                            <div>
                                <label for='pullSources'>Pull new observations from iNaturalist?</label>
                                <select id='pullSources' onChange={ (event) => setPullSources(event.target.value) }>
                                    <option value='yes' selected={pullSources === 'yes'}>Yes</option>
                                    <option value='no' selected={pullSources === 'no'}>No</option>
                                </select>
                            </div>
                            { pullSources === 'yes' &&
                                <>
                                    <div>
                                        <label for='sources'>iNaturalist Project Source IDs:</label>
                                        <input type='text' id='sources' required />
                                    </div>

                                    <div>
                                        <label for='minDate'>Min Date:</label>
                                        <input type='date' id='minDate' required />
                                    </div>

                                    <div>
                                        <label for='maxDate'>Max Date:</label>
                                        <input type='date' id='maxDate' required />
                                    </div>
                                </>
                            }
                        </>
                    }

                    <input type='submit' value='Submit' />
                </fieldset>
            </form>
        </TaskQueryBuilderContainer>
    )
}