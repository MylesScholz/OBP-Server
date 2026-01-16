import styled from '@emotion/styled'
import { useState } from 'react'

const SubtaskIOPanelContainer = styled.div`
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: stretch;

    .fileUploadContainer {
        display: flex;
        flex-direction: row;
        justify-content: start;
        align-items: start;
        gap: 10px;

        padding: 0px;

        white-space: nowrap;

        label {
            display: flex;
            align-items: center;
        }
    }

    .inputFileFieldset {
        display: flex;
        flex-direction: column;
        gap: 0px;

        legend {
            margin-bottom: 2px;

            padding: 0px;

            font-size: 12pt;
        }

        div {
            display: flex;
            flex-direction: row;
            justify-content: start;
            align-items: center;
            gap: 5px;

            font-size: 12pt;

            input[type='radio'] {
                margin: 0px;
            }

            label {
                display: flex;
                flex-direction: row;
                justify-content: start;
                align-items: center;
                gap: 5px;
            }
        }
    }

    .tipContainer {
        display: flex;
        flex-direction: column;
        align-items: stretch;
        gap: 0px;

        padding: 0px;
        padding-right: 25px;

        ul {
            margin: 0px;
            padding-left: 25px;
        }
    }
`

function capitalize(text) {
    if (!text) return ''
    return text.charAt(0).toUpperCase() + text.slice(1)
}

export default function SubtaskIOPanel({ type, taskState, setUpload, hoveredFile, setHoveredFile }) {
    const io = taskState.subtaskIO[type]
    const inputOptions = taskState.getInputOptions(type)
    const subtaskIndex = (taskState.getSubtaskOrdinal(type) - 1).toString()
    const hoveredIndex = hoveredFile?.split('_')?.at(0) ?? ''
    const hoveredFileType = hoveredFile?.split('_')?.at(1) ?? ''

    const defaultInputFile = inputOptions?.find((option) => !!option.default)?.key || 'upload'
    const [ selectedInputFile, setSelectedInputFile ] = useState(defaultInputFile)

    return (
        <SubtaskIOPanelContainer>
            { taskState.getFirstSubtask() === type && setUpload &&
                <div className='fileUploadContainer'>
                    <label htmlFor='fileUpload'>Upload File:</label>
                    <input
                        type='file'
                        accept='.csv'
                        id='fileUpload'
                        required
                        onChange={ (event) => setUpload(event.target.files[0]) }
                    />
                </div>
            }
            { taskState.getFirstSubtask() !== type &&
                <fieldset className={`inputFileFieldset`}>
                    <legend>Input File:</legend>
                    <div>
                        <input
                            type='radio'
                            id={`${type}Input-upload`}
                            name={`${type}Input`}
                            value='upload'
                            checked={selectedInputFile === 'upload'}
                            onChange={(event) => setSelectedInputFile(event.target.value)}
                        />
                        <label htmlFor={`${type}Input-upload`}>Upload</label>
                    </div>
                    {
                        inputOptions?.map((option) =>
                            <div onMouseEnter={(event) => setHoveredFile(option.key)} onMouseLeave={(event) => setHoveredFile(null)}>
                                <input
                                    type='radio'
                                    id={`${type}Input-${option.key}`}
                                    name={`${type}Input`}
                                    value={option.key}
                                    checked={selectedInputFile === option.key}
                                    onChange={(event) => setSelectedInputFile(event.target.value)}
                                />
                                <label htmlFor={`${type}Input-${option.key}`}>
                                    {capitalize(option.subtask)} subtask ({option.subtaskIndex + 1}):
                                    <span className={`fileTip ${option.output}FileTip ${hoveredFile === option.key ? 'hoveredFileTip' : ''}`}>{option.output} file</span>
                                </label>
                            </div>
                        )
                    }
                </fieldset>
            }
            { io &&
                <div className='tipContainer'>
                    <p>Output Files:</p>
                    { io?.outputs?.length > 0 &&
                        <ul>
                            {
                                io?.outputs?.map((output) =>
                                    <li
                                        className={`fileTip ${output}FileTip ${hoveredIndex === subtaskIndex && hoveredFileType === output ? 'hoveredFileTip' : ''}`}
                                        onMouseEnter={(event) => setHoveredFile(`${subtaskIndex}_${output}`)}
                                        onMouseLeave={(event) => setHoveredFile(null)}
                                    >{output} file</li>
                                )
                            }
                        </ul>
                    }
                </div>
            }
        </SubtaskIOPanelContainer>
    )
}