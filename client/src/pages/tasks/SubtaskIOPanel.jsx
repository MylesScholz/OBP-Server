import styled from '@emotion/styled'
import { useEffect, useState } from 'react'

import { useFlow } from '../../FlowProvider'

const SubtaskIOPanelContainer = styled.div`
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: stretch;
    gap: 10px;

    white-space: nowrap;

    .inputFileFieldset {
        display: flex;
        flex-direction: column;
        gap: 5px;

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

        .warningMessage {
            color: firebrick;
            font-weight: bold;
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

export default function SubtaskIOPanel({ type, taskState, pipelineState, setPipelineState }) {
    const { results } = useFlow()

    const io = taskState.subtaskIO[type]
    const inputOptions = taskState.getInputOptions(type)
    const subtaskIndex = (taskState.getSubtaskOrdinal(type) - 1).toString()
    const hoveredIndex = pipelineState.hoveredFile.split('_').at(0) ?? ''
    const hoveredFileType = pipelineState.hoveredFile.split('_').at(1) ?? ''

    const selectionAvailable = io?.inputs?.includes('occurrences') && results?.pagination?.totalDocuments > 0
    const uploadAvailable = taskState.getFirstSubtask() === type
    const defaultInputFile = inputOptions?.find((option) => !!option.default)?.key || (selectionAvailable && 'selection') || (uploadAvailable && 'upload')
    const [ selectedInputFile, setSelectedInputFile ] = useState(defaultInputFile)

    useEffect(() => {
        if (!inputOptions.includes(selectedInputFile) && selectedInputFile !== 'selection' && selectedInputFile !== 'upload') {
            setSelectedInputFile(defaultInputFile)
        }
    }, [inputOptions])

    return (
        <SubtaskIOPanelContainer>
            <fieldset className='inputFileFieldset'>
                <legend>Input File:</legend>
                { inputOptions?.map((option) =>
                    <div
                        onMouseEnter={() => setPipelineState({ ...pipelineState, hoveredFile: option.key })}
                        onMouseLeave={() => setPipelineState({ ...pipelineState, hoveredFile: '' })}
                    >
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
                            <span className={`fileTip ${option.output}FileTip ${pipelineState.hoveredFile === option.key ? 'hoveredFileTip' : ''}`}>{option.output} file</span>
                        </label>
                    </div>
                )}
                { selectionAvailable &&
                    <div>
                        <input
                            type='radio'
                            id={`${type}Input-selection`}
                            name={`${type}Input`}
                            value='selection'
                            checked={selectedInputFile === 'selection'}
                            onChange={(event) => setSelectedInputFile(event.target.value)}
                        />
                        <label htmlFor={`${type}Input-selection`}>Selection ({results?.pagination?.totalDocuments?.toLocaleString('en-US') ?? '0'} occurrences)</label>
                    </div>
                }
                { uploadAvailable &&
                    <div onClick={() => setSelectedInputFile('upload')}>
                        <input
                            type='radio'
                            id={`${type}Input-upload`}
                            name={`${type}Input`}
                            value='upload'
                            checked={selectedInputFile === 'upload'}
                            onChange={(event) => setSelectedInputFile(event.target.value)}
                        />
                        <label htmlFor={`${type}Input-upload`}>Upload</label>
                        <input
                            type='file'
                            accept='.csv'
                            id='fileUpload'
                            required={selectedInputFile === 'upload'}
                        />
                    </div>
                }
                { !defaultInputFile &&
                    <div>
                        <p className='warningMessage'>No valid input files</p>
                    </div>
                }
            </fieldset>

            { io &&
                <div className='tipContainer'>
                    <p>Output Files:</p>
                    { io?.outputs?.length > 0 &&
                        <ul>
                            {
                                io?.outputs?.map((output) =>
                                    <li
                                        className={`fileTip ${output}FileTip ${hoveredIndex === subtaskIndex && hoveredFileType === output ? 'hoveredFileTip' : ''}`}
                                        key={output}
                                        onMouseEnter={() => setPipelineState({ ...pipelineState, hoveredFile: `${subtaskIndex}_${output}` })}
                                        onMouseLeave={() => setPipelineState({ ...pipelineState, hoveredFile: '' })}
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