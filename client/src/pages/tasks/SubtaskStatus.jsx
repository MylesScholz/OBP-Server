import styled from '@emotion/styled'

const SubtaskStatusContainer = styled.div`
    display: flex;
    flex-direction: column;
    justify-content: start;
    align-items: stretch;
    gap: 10px;

    p {
        margin: 0px;
    }

    .authRequiredDownloadMessage {
        color: red;
        text-decoration: underline
    }
`

export default function SubtaskStatus({ type, selectedTaskData, downloads }) {
    return (
        <SubtaskStatusContainer>
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