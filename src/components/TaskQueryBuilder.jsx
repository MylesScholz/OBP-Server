import { useState } from 'react'
import axios from 'axios'
import styled from '@emotion/styled'

const ProjectSelectionContainer = styled.div`
    display: flex;
    flex-direction: column;

    .project {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 10px;

        border: 1px solid gray;
        border-radius: 5px;

        padding: 5px;
        
        p {
            margin: 0px;
        }

        button {
            margin: 0px;

            padding: 5px;

            width: 30px;
            height: 30px;

            text-align: center;
        }
    }

    #addProjectForm {
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
        gap: 10px;

        border: 1px solid gray;
        border-radius: 5px;

        padding: 5px;

        #projectNameQuery {
            flex-grow: 1;
        }

        #submitProject {
            margin: 0px;

            padding: 5px;

            width: 30px;
            height: 30px;

            text-align: center;
        }
    }
`

function ProjectSelection() {
    const defaultProjects = [
        { name: 'Oregon Bee Atlas', id: '18521' },
        { name: 'Master Melittologist (outside of Oregon)', id: '99706' },
        { name: 'Washington Bee Atlas', id: '166376' }
    ]
    const [ projects, setProjects ] = useState(defaultProjects)
    const [ newProjectQuery, setNewProjectQuery ] = useState('')

    function handleRemove(projectId) {
        setProjects(projects.filter((p) => p.id !== projectId))
    }

    async function handleAdd() {
        const trimmedQuery = newProjectQuery.trim()
        if (trimmedQuery) {
            const queryURL = `https://api.inaturalist.org/v1/projects/autocomplete?q=${trimmedQuery}`
            const res = await axios.get(queryURL)
            const topResult = res?.data?.results?.at(0)

            if (topResult && projects.every((p) => p.id != topResult.id)) {
                setProjects([...projects, { name: topResult.title, id: topResult.id }])
            }
            
            setNewProjectQuery('')
        }
    }

    return (
        <ProjectSelectionContainer>
            <label for='sources'>iNaturalist Projects:</label>
            <input type='hidden' id='sources' value={projects.map((p) => p.id).join(',')} />

            { projects.map((project) => (
                <div key={project.id} className='project'>
                    <p>{project.name} (ID: {project.id})</p>
                    <button onClick={ () => handleRemove(project.id) }>X</button>
                </div>
            )) }

            <div id='addProjectForm'>
                <input
                    type='text'
                    id='projectNameQuery'
                    placeholder='Search for an iNaturalist Project...'
                    value={newProjectQuery}
                    onChange={(e) => setNewProjectQuery(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { handleAdd() } }}
                />
                <button type='button' id='submitProject' onClick={ handleAdd }>+</button>
            </div>
        </ProjectSelectionContainer>
    )
}

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
    const [ taskType, setTaskType ] = useState('observations')
    const [ file, setFile ] = useState()
    const [ pullSources, setPullSources ] = useState('yes')

    const serverAddress = `${import.meta.env.VITE_SERVER_HOST || 'localhost'}`

    const firstDay = new Date(new Date().getFullYear(), 0, 1)
    const firstDayFormatted = `${firstDay.getFullYear()}-${(firstDay.getMonth() + 1).toString().padStart(2, '0')}-${firstDay.getDate().toString().padStart(2, '0')}`
    const currentDate = new Date()
    const currentDateFormatted = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${currentDate.getDate().toString().padStart(2, '0')}`

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
                            <option value='addresses'>Compile Mailing Addresses</option>
                        </select>
                    </div>

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
                                    <ProjectSelection />

                                    <div>
                                        <label for='minDate'>Minimum Date:</label>
                                        <input type='date' id='minDate' value={firstDayFormatted} required />
                                    </div>

                                    <div>
                                        <label for='maxDate'>Maximum Date:</label>
                                        <input type='date' id='maxDate' value={currentDateFormatted} required />
                                    </div>
                                </>
                            }
                        </>
                    }

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

                    { taskType === 'addresses' &&
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

                    <input type='submit' value='Submit' />
                </fieldset>
            </form>
        </TaskQueryBuilderContainer>
    )
}