import { useState } from 'react'
import axios from 'axios'
import styled from '@emotion/styled'

import ProjectSelection from './ProjectSelection'

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
        gap: 10px;

        h2 {
            margin: 0px;
            margin-bottom: 5px;

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
    const [ taskType, setTaskType ] = useState('occurrences')
    const [ file, setFile ] = useState()
    const [ pullSources, setPullSources ] = useState('yes')

    const firstDay = new Date(new Date().getFullYear(), 0, 1)
    const firstDayFormatted = `${firstDay.getFullYear()}-${(firstDay.getMonth() + 1).toString().padStart(2, '0')}-${firstDay.getDate().toString().padStart(2, '0')}`
    const currentDate = new Date()
    const currentDateFormatted = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${currentDate.getDate().toString().padStart(2, '0')}`
    const [ minDate, setMinDate ] = useState(firstDayFormatted)
    const [ maxDate, setMaxDate ] = useState(currentDateFormatted)

    const serverAddress = `${import.meta.env.VITE_SERVER_HOST || 'localhost'}`

    function handleSubmit(event) {
        event.preventDefault()

        setFormDisabled(true)
        setQueryResponse(undefined)
        setResult(undefined)

        const formData = new FormData()
        formData.append('file', file)
        if (taskType === 'occurrences' && pullSources === 'yes') {
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
                            <option value='occurrences'>Format Occurrences</option>
                            <option value='labels'>Create Labels</option>
                            <option value='addresses'>Compile Mailing Addresses</option>
                            <option value='emails'>Compile Email Addresses</option>
                        </select>
                    </div>

                    { taskType === 'occurrences' &&
                        <>
                            <div>
                                <label for='fileUpload'>Occurrences File:</label>
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
                                    <ProjectSelection />

                                    <div>
                                        <label for='minDate'>Minimum Date:</label>
                                        <input type='date' id='minDate' value={minDate} onChange={(e) => setMinDate(e.target.value)} required />
                                    </div>

                                    <div>
                                        <label for='maxDate'>Maximum Date:</label>
                                        <input type='date' id='maxDate' value={maxDate} onChange={(e) => setMaxDate(e.target.value)} required />
                                    </div>
                                </>
                            }
                        </>
                    }

                    { taskType === 'labels' &&
                        <div>
                            <label for='fileUpload'>Occurrences File:</label>
                            <input
                                type='file'
                                accept='.csv'
                                id='fileUpload'
                                required
                                onChange={ (event) => setFile(event.target.files[0]) }
                            />
                        </div>
                    }

                    { taskType === 'addresses' &&
                        <div>
                            <label for='fileUpload'>Pulls File:</label>
                            <input
                                type='file'
                                accept='.csv'
                                id='fileUpload'
                                required
                                onChange={ (event) => setFile(event.target.files[0]) }
                            />
                        </div>
                    }

                    { taskType === 'emails' &&
                        <div>
                            <label for='fileUpload'>Flags File:</label>
                            <input
                                type='file'
                                accept='.csv'
                                id='fileUpload'
                                required
                                onChange={ (event) => setFile(event.target.files[0]) }
                            />
                        </div>
                    }

                    <input type='submit' value='Submit' />
                </fieldset>
            </form>
        </TaskQueryBuilderContainer>
    )
}