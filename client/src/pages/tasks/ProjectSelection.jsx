import { useState } from 'react'
import axios from 'axios'
import styled from '@emotion/styled'

import closeIcon from '/src/assets/close.svg'
import addIcon from '/src/assets/add.svg'

const ProjectSelectionContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 5px;

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
            display: flex;
            justify-content: center;
            align-items: center;

            border: 1px solid gray;
            border-radius: 5px;

            padding: 5px;

            background-color: white;

            &:hover {
                background-color: #efefef;
            }

            img {
                width: 20px;
                height: 20px;
            }
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

            border: 1px solid gray;
            border-radius: 5px;

            padding: 3px;
        }

        #submitProject {
            display: flex;
            justify-content: center;
            align-items: center;

            border: 1px solid gray;
            border-radius: 5px;

            padding: 5px;

            background-color: white;

            &:hover {
                background-color: #efefef;
            }

            img {
                width: 20px;
                height: 20px;
            }
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
            const res = await axios.get(`https://api.inaturalist.org/v1/projects/autocomplete?q=${trimmedQuery}`)
            const topResult = res?.data?.results?.at(0)

            if (topResult && projects.every((p) => p.id != topResult.id)) {
                setProjects([...projects, { name: topResult.title, id: topResult.id }])
            }
            
            setNewProjectQuery('')
        }
    }

    return (
        <ProjectSelectionContainer>
            <label htmlFor='sources'>iNaturalist Projects:</label>
            <input type='hidden' id='sources' value={projects.map((p) => p.id).join(',')} />

            { projects.map((project) => (
                <div key={project.id} className='project'>
                    <p>{project.name} (ID: {project.id})</p>
                    <button onClick={ () => handleRemove(project.id) }>
                        <img src={closeIcon} alt='Remove' />
                    </button>
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
                <button type='button' id='submitProject' onClick={ handleAdd }>
                    <img src={addIcon} alt='Add' />
                </button>
            </div>
        </ProjectSelectionContainer>
    )
}