import styled from '@emotion/styled'

const DatasetsMenuContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;

    border: 1px solid #222;
    border-radius: 5px;

    padding: 15px;

    h2 {
        margin: 0px;

        font-size: 16pt;
    }

    .toolList {
        display: flex;
        flex-direction: column;
        align-items: start;
        gap: 10px;

        margin: 0px;
        margin-bottom: 10px;

        padding: 0px;
        padding-left: 10px;

        button {
            border: 0px;

            padding: 0px;

            font-size: 14pt;

            background-color: transparent;

            cursor: pointer;

            &:hover {
                text-decoration: underline;
                color: #444;
            }
        }

        .selectedTool {
            text-decoration: underline;
        }
    }
`

export default function DatasetsMenu({ selectedTool, setSelectedTool }) {
    return (
        <DatasetsMenuContainer>
            <h2>Manage Datasets</h2>

            <div className='toolList'>
                <button
                    className={ selectedTool === 'syncOccurrences' ? 'selectedTool' : '' }
                    onClick={() => setSelectedTool('syncOccurrences')}
                >Occurrences</button>
                <button
                    className={ selectedTool === 'determinations' ? 'selectedTool' : '' }
                    onClick={(e) => setSelectedTool('determinations')}
                >Determinations</button>
                <button
                    className={ selectedTool === 'usernames' ? 'selectedTool' : '' }
                    onClick={(e) => setSelectedTool('usernames')}
                >Usernames</button>
                <button
                    className={ selectedTool === 'plantList' ? 'selectedTool' : '' }
                    onClick={() => setSelectedTool('plantList')}
                >Plant List</button>
                <button
                    className={ selectedTool === 'archive' ? 'selectedTool' : '' }
                    onClick={(e) => setSelectedTool('archive')}
                >Archive</button>
            </div>
        </DatasetsMenuContainer>
    )
}