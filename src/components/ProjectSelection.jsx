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

export default function ProjectSelection() {
    const defaultProjects = [
        { name: 'Oregon Bee Atlas', id: '18521' },
        { name: 'Master Melittologist', id: '99706' },
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