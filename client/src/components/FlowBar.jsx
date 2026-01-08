import styled from '@emotion/styled'

import chevronRightIcon from '/src/assets/chevron_right.svg'
import { NavLink } from 'react-router'

const FlowBarContainer = styled.div`
    display: flex;
    flex-direction: row;
    justify-content: start;
    align-items: center;
    gap: 15px;

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

        img {
            height: 100%;
        }
    }
`

export default function FlowBar() {
    return (
        <FlowBarContainer>
            <NavLink className='flowStage' to='/dashboard'>
                <h3>Stage 1</h3>
                <img src={chevronRightIcon} alt='Next' />
            </NavLink>
            <NavLink className='flowStage' to='/tasks'>
                <h3>Stage 2</h3>
                <img src={chevronRightIcon} alt='Next' />
            </NavLink>
        </FlowBarContainer>
    )
}