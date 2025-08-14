import styled from '@emotion/styled'

import SubtaskStatus from './SubtaskStatus'
import SubtaskCardForm from './SubtaskCardForm'

const SubtaskCardContainer = styled.div`
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    gap: 15px;

    border: 1px solid gray;
    border-radius: 5px;

    padding: 10px;

    max-width: 50%;
    min-height: 425px;

    h2 {
        margin: 0px;

        font-size: 16pt;
    }

    p {
        margin: 0px;
    }
`

export default function SubtaskCard({ type, ordinal, formVisible, setFile, handleRemove, selectedTaskData, downloads }) {
    return (
        <SubtaskCardContainer>
            <h2>{ordinal}. {type.charAt(0).toUpperCase() + type.slice(1)} Subtask</h2>

            { formVisible &&
                <SubtaskCardForm type={type} setFile={setFile} handleRemove={handleRemove} />
            }
            { !formVisible &&
                <SubtaskStatus
                    type={type}
                    selectedTaskData={selectedTaskData}
                    downloads={downloads}
                />
            }
        </SubtaskCardContainer>
    )
}