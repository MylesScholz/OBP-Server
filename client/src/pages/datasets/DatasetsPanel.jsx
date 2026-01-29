import { useState } from 'react'
import styled from '@emotion/styled'

import DatasetsMenu from './DatasetsMenu'
import DeterminationsAccessForm from './DeterminationsAccessForm'
import UsernamesAccessForm from './UsernamesAccessForm'
import PlantListAccessForm from './PlantListAccessForm'
import ArchiveBrowser from './ArchiveBrowser'

const DatasetsPanelContainer = styled.div`
    display: grid;
    grid-template-columns: 3fr 9fr;
    grid-column-gap: 10px;
`

export default function DatasetsPanel() {
    const [ selectedTool, setSelectedTool ] = useState('syncOccurrences')

    return (
        <DatasetsPanelContainer>
            <DatasetsMenu selectedTool={selectedTool} setSelectedTool={setSelectedTool} />

            { selectedTool === 'determinations' &&
                <DeterminationsAccessForm />
            }
            { selectedTool === 'usernames' &&
                <UsernamesAccessForm />
            }
            { selectedTool === 'plantList' &&
                <PlantListAccessForm />
            }
            { selectedTool === 'archive' &&
                <ArchiveBrowser />
            }
        </DatasetsPanelContainer>
    )
}