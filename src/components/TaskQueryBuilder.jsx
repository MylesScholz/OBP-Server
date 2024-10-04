import { useState } from 'react'
import axios from 'axios'
import styled from '@emotion/styled'

const TaskQueryBuilderContainer = styled.div``

export default function TaskQueryBuilder({ setQueryResponse }) {
    const [ taskType, setTaskType ] = useState('observations')
    const [ file, setFile ] = useState()

    const serverAddress = `${import.meta.env.VITE_SERVER_HOST || 'localhost'}`

    function handleSubmit(event) {
        event.preventDefault()

        const formData = new FormData()
        formData.append('file', file)
        if (taskType === 'observations') {
            formData.append('sources', event.target.sources.value)
            formData.append('minDate', event.target.minDate.value)
            formData.append('maxDate', event.target.maxDate.value)
        }

        // console.log([...formData.entries()])

        const requestURL = `https://api.${serverAddress}/tasks/${taskType}`
        axios.postForm(requestURL, formData).then((res) => {
            setQueryResponse({ status: res.status, data: res.data })
        }).catch((err) => {
            setQueryResponse({ status: err.response.status, data: err.response.data })
        })
    }

    return (
        <TaskQueryBuilderContainer>
            <form onSubmit={ handleSubmit }>
                <label for='queryType'>Task Type:</label>
                <select id='queryType' onChange={ (event) => setTaskType(event.target.value) }>
                    <option value='observations'>Observations</option>
                    <option value='labels'>Labels</option>
                </select>

                <label for='fileUpload'>File:</label>
                <input
                    type='file'
                    accept='.csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel'
                    id='fileUpload'
                    required
                    onChange={ (event) => { setFile(event.target.files[0]) } }
                />

                { taskType === 'observations' &&
                    <>
                        <label for='sources'>iNaturalist Project Source IDs:</label>
                        <input type='text' id='sources' required />

                        <label for='minDate'>Min Date:</label>
                        <input type='date' id='minDate' required />

                        <label for='maxDate'>Max Date:</label>
                        <input type='date' id='maxDate' required />
                    </>
                }

                <input type='submit' value='Submit' />
            </form>
        </TaskQueryBuilderContainer>
    )
}