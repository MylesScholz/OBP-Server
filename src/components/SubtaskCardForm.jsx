import styled from '@emotion/styled'
import { useState } from 'react'

import ProjectSelection from './ProjectSelection'

const SubtaskCardFormContainer = styled.div`
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    flex-grow: 1;
    gap: 15px;

    fieldset {
        display: flex;
        flex-direction: column;
        justify-content: start;
        gap: 15px;

        margin: 0px;

        border: none;

        padding: 0px;

        font-size: 12pt;

        p {
            margin: 0px;
        }

        div {
            display: flex;
            gap: 10px;

            white-space: nowrap;

            label {
                display: flex;
                align-items: center;
            }
        }

        .ioTipContainer {
            display: flex;
            flex-direction: row;
            justify-content: space-between;
            align-items: start;
            gap: 5px;

            .tipContainer {
                display: flex;
                flex-direction: column;
                align-items: start;
                gap: 0px;

                padding: 0px 25px;

                ul {
                    margin: 0px;
                    padding-left: 25px;

                    .fileTip {
                        font-weight: bold;
                    }
                }
            }
        }

        .occurrencesFileTip {
            color: var(--occurrences-file-color);
        }

        .duplicatesFileTip {
            color: var(--duplicates-file-color);
        }

        .pullsFileTip {
            color: var(--pulls-file-color);
        }

        .flagsFileTip {
            color: var(--flags-file-color);
        }

        .labelsFileTip {
            color: var(--labels-file-color);
        }

        .addressesFileTip {
            color: var(--addresses-file-color);
        }

        .emailsFileTip {
            color: var(--emails-file-color);
        }

        .pivotsFileTip {
            color: var(--pivots-file-color);
        }
    }

    #removeSubtask {
        height: 35px;

        font-size: 12pt;
    }
`

function capitalize(text) {
    if (!text) return ''
    return text.charAt(0).toUpperCase() + text.slice(1)
}

export default function SubtaskCardForm({ type, io, setFile, inputOptions, handleRemove }) {
    const firstDay = new Date(new Date().getFullYear(), 0, 1)
    const firstDayFormatted = `${firstDay.getFullYear()}-${(firstDay.getMonth() + 1).toString().padStart(2, '0')}-${firstDay.getDate().toString().padStart(2, '0')}`
    const currentDate = new Date()
    const currentDateFormatted = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${currentDate.getDate().toString().padStart(2, '0')}`
    const [ minDate, setMinDate ] = useState(firstDayFormatted)
    const [ maxDate, setMaxDate ] = useState(currentDateFormatted)

    const descriptions = {
        'occurrences': 'Formats and updates an occurrences file',
        'observations': 'Pulls observations from iNaturalist and merges them into an occurrences file',
        'labels': 'Creates a sheet of labels from an occurrences or pulls file',
        'addresses': 'Compiles a list of mailing addresses from an occurrences or pulls file',
        'emails': 'Compiles a list of emails categorized by error type from a flags file',
        'pivots': 'Creates pivot tables from an occurrences or pulls file'
    }

    return (
        <SubtaskCardFormContainer>
            <fieldset>
                <p>{descriptions[type]}</p>
                { io &&
                    <div className='ioTipContainer'>
                        <div className='tipContainer'>
                            <p>Input File Types:</p>
                            { io?.inputs?.length > 0 &&
                                <ul>
                                    { io?.inputs?.map((input) => <li className={`fileTip ${input}FileTip`}>{input} file</li>) }
                                </ul>
                            }
                        </div>
                        <div className='tipContainer'>
                            <p>Output File Types:</p>
                            { io?.outputs?.length > 0 &&
                                <ul>
                                    { io?.outputs?.map((output) => <li className={`fileTip ${output}FileTip`}>{output} file</li>) }
                                </ul>
                            }
                        </div>
                    </div>   
                }

                { !!setFile &&
                    <div>
                        <label for='fileUpload'>Upload File:</label>
                        <input
                            type='file'
                            accept='.csv'
                            id='fileUpload'
                            required
                            onChange={ (event) => setFile(event.target.files[0]) }
                        />
                    </div>
                }
                { !setFile &&
                    <div>
                        <label for={`${type}Input`}>Input File:</label>
                        <select name={`${type}Input`} id={`${type}Input`}>
                            <option key='upload' value='upload' selected={inputOptions?.length === 0}>Upload</option>
                            {
                                inputOptions?.map((option) =>
                                    <option
                                        key={option.key}
                                        value={option.key}
                                        selected={!!option.default}
                                    >
                                        {capitalize(option.subtask)} subtask ({option.subtaskIndex + 1}): {option.output} file
                                    </option>
                                )
                            }
                        </select>
                    </div>
                }
                { type === 'observations' &&
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
            </fieldset>

            <button type='button' id='removeSubtask' onClick={ (event) => handleRemove(type) }>Remove</button>
        </SubtaskCardFormContainer>
    )   
}