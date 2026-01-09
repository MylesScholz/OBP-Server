import { useState } from 'react'
import { Link } from 'react-router'
import styled from '@emotion/styled'
import axios from 'axios'

import arrowForwardIcon from '/src/assets/arrow_forward.svg'
import { OccurrencesPanel } from '../../components/OccurrencesPanel'

const DashboardContainer = styled.form`
    display: grid;
    grid-template-columns: 350px minmax(0, 1fr);
    grid-template-rows: 55px 1fr;
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

export default function Dashboard() {
    const [ results, setResults ] = useState({})

    // The URL or IP address of the backend server
    const serverAddress = `${import.meta.env.VITE_SERVER_HOST || 'localhost'}`

    function handleSubmit (event) {
        event.preventDefault()

        const queryUrl = new URL(`http://${serverAddress}/api/occurrences`)
        const params = queryUrl.searchParams

        params.set('per_page', '25')

        axios.get(queryUrl.toString()).then((res) => {
            setResults(res.data)
        }).catch((error) => {
            console.error(error)
        })
    }

    return (
        <DashboardContainer onSubmit={ handleSubmit }>
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
                <OccurrencesPanel occurrences={results?.data ?? []} />
            </div>
        </DashboardContainer>
    )
}