import styled from '@emotion/styled'
import { useState } from 'react'

import ProjectSelection from './ProjectSelection'
import SubtaskIOPanel from './SubtaskIOPanel'

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

        .subtaskSetting {
            display: flex;
            align-items: center;
            gap: 10px;

            white-space: nowrap;

            label {
                display: flex;
                align-items: center;
            }

            input[type='date'] {
                border: 1px solid gray;
                border-radius: 5px;

                padding: 3px;
            }

            input[type='checkbox'] {
                margin: 0px;

                border: 1px solid gray;
                border-radius: 5px;

                width: 15px;
                height: 15px;
            }
        }
    }

    #removeSubtask {
        height: 35px;

        font-size: 12pt;
    }
`

export default function SubtaskCardForm({ type, taskState, pipelineState, setPipelineState }) {
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

                <SubtaskIOPanel
                    type={type}
                    taskState={taskState}
                    pipelineState={pipelineState}
                    setPipelineState={setPipelineState}
                />

                { type === 'observations' &&
                    <>
                        <ProjectSelection />
                        
                        <div className='subtaskSetting'>
                            <label htmlFor='minDate'>Minimum Date:</label>
                            <input id='minDate' type='date' value={minDate} onChange={(e) => setMinDate(e.target.value)} required />
                        </div>
                        <div className='subtaskSetting'>
                            <label htmlFor='maxDate'>Maximum Date:</label>
                            <input id='maxDate' type='date' value={maxDate} onChange={(e) => setMaxDate(e.target.value)} required />
                        </div>
                    </>
                }
                { (type === 'labels' || type === 'addresses') &&
                    <div className='subtaskSetting'>
                        <label>Ignore dateLabelPrint field:</label>
                        <input
                            id={`${type}IgnoreDateLabelPrint`}
                            type='checkbox'
                            autoComplete='off'
                            checked={pipelineState.ignoreDateLabelPrint}
                            onChange={(event) => setPipelineState({ ...pipelineState, ignoreDateLabelPrint: event.target.checked })}
                        />
                    </div>
                }
            </fieldset>
        </SubtaskCardFormContainer>
    )   
}