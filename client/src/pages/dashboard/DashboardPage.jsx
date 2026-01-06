import styled from '@emotion/styled'
import { Navigate, Link } from 'react-router'

import arrowForwardIcon from '/src/assets/arrow_forward.svg'
import { useAuth } from '../../AuthProvider'

const DashboardPageContainer = styled.form`
    display: grid;
    grid-template-columns: 1fr 4fr;
    grid-template-rows: 1fr 9fr;
    grid-column-gap: 15px;
    grid-row-gap: 15px;

    #toolBar {
        grid-row: 1 / 3;

        display: flex;
        flex-direction: column;
        gap: 15px;

        border: 1px solid #222;

        padding: 15px;

        #searchFilters {
            display: flex;
            flex-direction: column;
            gap: 10px;

            h3 {
                margin: 0px;

                font-size: 14pt;
            }

            p {
                margin: 0px;

                font-size: 12pt;
            }

            button {
                font-size: 14pt;
            }

            #matchFieldFilter {
                display: grid;
                grid-template-columns: 1fr 7fr;
                grid-row-gap: 5px;

                padding: 0px 5px;

                p {
                    grid-column: 1 / 3;
                }

                select, input {
                    grid-column: 2 / 3;
                }
            }

            #dateFilter {
                display: grid;
                grid-template-columns: 1fr 2fr 5fr;
                grid-column-gap: 5px;
                grid-row-gap: 5px;

                padding: 0px 5px;

                p {
                    grid-column: 1 / 4;
                }

                label {
                    grid-column: 2 / 3;
                }

                input {
                    grid-column: 3 / 4;
                }
            }
        }

        .toolLink {
            display: flex;
            flex-direction: row;
            justify-content: start;
            align-items: center;
            gap: 10px;

            font-size: 14pt;
            font-weight: bold;
            text-decoration: none;

            &:hover {
                text-decoration: underline;
            }

            &:link, &:visited {
                color: #222;
            }
        }
    }

    #resultsHeader {
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
        gap: 10px;

        border: 1px solid #222;

        padding: 15px;

        white-space: nowrap;

        #sortDirContainer {
            display: flex;
            flex-direction: row;
            justify-content: center;
            align-items: center;
            gap: 10px;

            label {
                margin: 0px;

                font-size: 12pt;
            }
        }

        #resultsPagination {
            display: flex;
            flex-direction: row;
            justify-content: center;
            align-items: center;
            gap: 20px;

            p {
                margin: 0px;

                font-size: 12pt;
            }

            #resultsPageSelector {
                display: flex;
                flex-direction: row;
                justify-content: center;
                align-items: center;
                gap: 5px;
            }
        }
    }

    #resultsContainer {
        border: 1px solid #222;
    }
`

export default function DashboardPage() {
    const { loggedIn } = useAuth()

    console.log('/dashboard:', loggedIn)

    return (
        <DashboardPageContainer>
            { !loggedIn && <Navigate to='/' /> }
            <div id='toolBar'>
                <div id='searchFilters'>
                    <h3>Search Records</h3>
                    <div id='matchFieldFilter'>
                        <p>Match Field</p>
                        <select id='fieldName'>
                            <option>fieldNumber</option>
                        </select>
                        <input type='text' placeholder='Enter a query...' />
                    </div>
                    <div id='dateFilter'>
                        <p>Date</p>
                        <label>From</label>
                        <input type='date' />
                        <label>To</label>
                        <input type='date' />
                    </div>
                    <input type='submit' value='Search' />
                </div>

                <Link className='toolLink' to='tasks'>
                    Run Task
                    <img src={arrowForwardIcon} alt='Go to' />
                </Link>
                <Link className='toolLink' to='tasks/history'>
                    Task History
                    <img src={arrowForwardIcon} alt='Go to' />
                </Link>
                <Link className='toolLink' to='datasets'>
                    Manage Datasets
                    <img src={arrowForwardIcon} alt='Go to' />
                </Link>
                <Link className='toolLink' to='accounts'>
                    Manage Accounts
                    <img src={arrowForwardIcon} alt='Go to' />
                </Link>
            </div>

            <div id='resultsHeader'>
                <div id='sortDirContainer'>
                    <label htmlFor='sortDir'>Sort By:</label>
                    <select id='sortDir'>
                        <option>fieldNumber (desc)</option>
                        <option>fieldNumber (asc)</option>
                        <option>verbatimEventDate (desc)</option>
                        <option>verbatimEventDate (asc)</option>
                    </select>
                </div>
                <div id='resultsPagination'>
                    <p>Showing 25 of 206,254 records</p>
                    <div id='resultsPageSelector'>
                        <button>Prev</button>
                        <input id='resultsPage' type='text' value='Page 1 of 8,252' />
                        <button>Next</button>
                    </div>
                </div>
            </div>

            <div id='resultsContainer'>

            </div>
        </DashboardPageContainer>
    )
}