import styled from '@emotion/styled'

const SubtaskStatusContainer = styled.div`
    display: flex;
    flex-direction: column;
    justify-content: start;
    align-items: stretch;
    gap: 10px;

    h3 {
        margin: 0px;

        font-size: 12pt;
    }

    p {
        margin: 0px;

        font-size: 12pt;
    }

    .input {
        display: flex;
        flex-direction: row;
        justify-content: start;
        align-items: center;
        gap: 5px;

        white-space: nowrap;
    }

    .authRequiredDownloadMessage {
        color: red;
        text-decoration: underline
    }
`

function capitalize(text) {
    if (!text) return ''
    return text.charAt(0).toUpperCase() + text.slice(1)
}

export default function SubtaskStatus({ type, taskState, selectedTaskData, downloads }) {

    const subtask = selectedTaskData?.task?.subtasks?.find((subtask) => subtask.type === type)
    let inputText = ''
    if (subtask?.input && ['none', 'selection', 'upload'].includes(subtask.input)) {
        inputText = capitalize(subtask.input)
    }
    const parts = subtask?.input?.split('_') ?? []
    const index = !isNaN(parseInt(parts[0])) ? parseInt(parts[0]) : -1
    const enabledSubtasks = taskState.getEnabledSubtasks()

    return (
        <SubtaskStatusContainer>
            <h3>Input:</h3>
            { inputText && <p className='input'>{inputText}</p> }
            { index !== -1 &&
                <p className='input'>
                    {capitalize(enabledSubtasks[index])} subtask ({index + 1}):
                    <span className={`fileTip ${parts[1]}FileTip`}>{parts[1]} file</span>
                </p>
            }

            <h3>Outputs:</h3>
            { selectedTaskData?.error &&
                <p>Error: {selectedTaskData.status} {selectedTaskData.statusText}</p>
            }
            { selectedTaskData?.task &&
                <>
                    { selectedTaskData.task.progress?.currentSubtask === type &&
                        <>
                            <p>Current Step: {selectedTaskData.task.progress.currentStep}</p>
                            { selectedTaskData.task.progress.percentage && <p>{selectedTaskData.task.progress.percentage}</p> }
                        </>
                    }
                    {
                        downloads?.filter((d) => d.subtask === type).map((d) => {
                            if (d.responseStatus === 200) {
                                return <a href={d.url} download={d.fileName}>Download {d.type}{d.subtype ? ` (${d.subtype})` : ''} file</a>
                            } else if (d.responseStatus === 401) {
                                return <p className='authRequiredDownloadMessage'>Authentication Required</p>
                            } else {
                                return <p>Error {d.responseStatus}</p>
                            }
                        })
                    }
                    { type === 'labels' &&
                        selectedTaskData.task.warnings?.map((warning) => <p>{warning}</p>)
                    }
                </>
            }
        </SubtaskStatusContainer>
    )
}