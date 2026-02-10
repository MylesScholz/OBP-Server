import styled from '@emotion/styled'

import { NavLink } from 'react-router'
import { useFlow } from '../FlowProvider'
import { useAuth } from '../AuthProvider'

const FlowBarContainer = styled.div`
    display: flex;
    flex-direction: row;
    justify-content: start;
    align-items: center;
    gap: 25px;

    border: 1px solid #222;
    border-radius: 10px;

    padding: 15px;

    .flowStage {
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        align-items: center;

        text-decoration: none;

        &:hover, &.active {
            text-decoration: underline;
        }

        &:link, &:visited {
            color: #222;

            &:hover {
                color: #444;
            }
        }

        h3 {
            margin: 0px;

            font-size: 16pt;
            font-weight: bold;
        }
    }
`

export default function FlowBar() {
    const { query, results } = useFlow()
    const { admin, volunteer } = useAuth()

    const selectedString = results?.pagination?.totalDocuments?.toLocaleString('en-US') ?? '0'

    return (
        <FlowBarContainer>
            <NavLink className='flowStage' to='/dashboard'>
                <h3>Dashboard ({selectedString}{query.unsubmitted && <span style={{ color: 'dodgerblue' }}>*</span>} selected)</h3>
            </NavLink>
            { admin &&
                <>
                    <NavLink className='flowStage' to='/tasks'>
                        <h3>Tasks</h3>
                    </NavLink>
                    <NavLink className='flowStage' to='/datasets'>
                        <h3>Datasets</h3>
                    </NavLink>
                    <NavLink className='flowStage' to='/admin'>
                        <h3>Administration</h3>
                    </NavLink>
                </>
            }
        </FlowBarContainer>
    )
}