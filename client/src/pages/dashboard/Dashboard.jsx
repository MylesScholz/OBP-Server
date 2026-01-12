import { useState } from 'react'
import { Link } from 'react-router'
import styled from '@emotion/styled'
import axios from 'axios'

import chevronLeftIcon from '/src/assets/chevron_left.svg'
import chevronRightIcon from '/src/assets/chevron_right.svg'
import closeIcon from '/src/assets/close.svg'
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

        .clearButton {
            display: flex;
            justify-content: center;
            align-items: center;

            padding: 0px;

            width: 25px;
            height: 25px;

            img {
                width: 20px;
                height: 20px;
            }
        }

        #searchFilters {
            display: flex;
            flex-direction: column;
            gap: 10px;

            margin: 0px;

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
                grid-template-columns: 1fr 25px;
                grid-column-gap: 5px;
                grid-row-gap: 5px;

                padding: 0px 0px 0px 10px;

                p {
                    grid-column: 1 / 3;
                }

                select, input {
                    grid-column: 1 / 2;

                    margin-left: 10px;
                }

                .clearButton {
                    grid-column: 2 / 3;
                }
            }

            #dateFilter {
                display: grid;
                grid-template-columns: 1fr 5fr 25px;
                grid-column-gap: 5px;
                grid-row-gap: 5px;

                padding: 0px 0px 0px 10px;

                p {
                    grid-column: 1 / 4;
                }

                label {
                    grid-column: 1 / 2;

                    margin-left: 10px;
                }

                input {
                    grid-column: 2 / 3;
                }

                .clearButton {
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

        margin: 0px;

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

                input[type='number'] {
                    text-align: center;

                    width: 50px;

                    appearance: textfield;
                    -moz-appearance: textfield;
                    &::-webkit-inner-spin-button, &::-webkit-outer-spin-button {
                        -webkit-appearance: none;
                    }
                }

                .pageIncrementButton {
                    display: flex;
                    justify-content: center;
                    align-items: center;

                    padding: 0px;
                    
                    img {
                        width: 25px;
                        height: 25px;
                    }
                }
            }
        }
    }

    #resultsContainer {
        border: 1px solid #222;
    }
`

export default function Dashboard() {
    const [ disabled, setDisabled ] = useState(false)
    const [ results, setResults ] = useState({})
    const [ page, setPage ] = useState(1)

    const fields = [
        'errorFlags',
        'dateLabelPrint',
        'fieldNumber',
        'catalogNumber',
        'occurrenceID',
        'userId',
        'userLogin',
        'firstName',
        'firstNameInitial',
        'lastName',
        'recordedBy',
        'sampleId',
        'specimenId',
        'day',
        'month',
        'year',
        'day2',
        'month2',
        'year2',
        'startDayofYear',
        'endDayofYear',
        'verbatimEventDate',
        'country',
        'stateProvince',
        'county',
        'locality',
        'verbatimElevation',
        'decimalLatitude',
        'decimalLongitude',
        'coordinateUncertaintyInMeters',
        'samplingProtocol',
        'relationshipOfResource',
        'resourceID',
        'relatedResourceID',
        'relationshipRemarks',
        'phylumPlant',
        'orderPlant',
        'familyPlant',
        'genusPlant',
        'speciesPlant',
        'taxonRankPlant',
        'url',
        'phylum',
        'class',
        'order',
        'family',
        'genus',
        'subgenus',
        'specificEpithet',
        'taxonomicNotes',
        'scientificName',
        'sex',
        'caste',
        'taxonRank',
        'identifiedBy',
        'familyVolDet',
        'genusVolDet',
        'speciesVolDet',
        'sexVolDet',
        'casteVolDet',
    ]

    // The URL or IP address of the backend server
    const serverAddress = `${import.meta.env.VITE_SERVER_HOST || 'localhost'}`
    // Number of records to query per page
    const per_page = 25

    let pageMax = results?.pagination?.totalPages ? results?.pagination?.totalPages : 1
    let currentPage = results?.pagination?.currentPage ?? 1

    const pageRecords = results?.data?.length ?? 0
    const totalRecords = results?.pagination?.totalDocuments ?? 0
    const records = `Showing ${pageRecords.toLocaleString('en-US')} of ${totalRecords.toLocaleString('en-US')} records`
    const pages = `Page ${page.toLocaleString('en-US')} of ${pageMax.toLocaleString('en-US')}`

    function handleClear(event, clearElementId) {
        event.preventDefault()

        document.getElementById(clearElementId).value = ''
    }

    function handleSubmit (event) {
        event.preventDefault()
        setDisabled(true)

        const queryUrl = new URL(`http://${serverAddress}/api/occurrences`)
        const params = queryUrl.searchParams

        params.set('page', page.toString())
        params.set('per_page', per_page.toString())

        if (event.target.fieldName.value) {
            params.set(event.target.fieldName.value, event.target.queryText.value)
        }

        if (event.target.minDate.value) params.set('start_date', event.target.minDate.value)
        if (event.target.maxDate.value) params.set('end_date', event.target.maxDate.value)

        axios.get(queryUrl.toString()).then((res) => {
            setResults(res.data)

            pageMax = res.data?.pagination?.totalPages ? res.data?.pagination?.totalPages : 1
            currentPage = res.data?.pagination?.currentPage ?? 1
            setPage(Math.min(pageMax, currentPage))
            
            setDisabled(false)
        }).catch((error) => {
            console.error(error)
            setPage(1)
            setDisabled(false)
        })
    }

    return (
        <DashboardContainer onSubmit={ handleSubmit }>
            <div id='toolBar'>
                <fieldset id='searchFilters' disabled={disabled}>
                    <h3>Search Records</h3>
                    <div id='matchFieldFilter'>
                        <p>Match Field</p>

                        <select id='fieldName'>
                            <option key='select' value='' selected>Select a field to match...</option>
                            {fields.map((fieldName) => <option key={fieldName} value={fieldName}>{fieldName}</option>)}
                        </select>
                        <button className='clearButton' onClick={(event) => handleClear(event, 'fieldName')}>
                            <img src={closeIcon} alt='Clear' />
                        </button>

                        <input id='queryText' type='text' placeholder='Enter a query...' />
                        <button className='clearButton' onClick={(event) => handleClear(event, 'queryText')}>
                            <img src={closeIcon} alt='Clear' />
                        </button>
                    </div>
                    <div id='dateFilter'>
                        <p>Date</p>

                        <label>From</label>
                        <input id='minDate' type='date' />
                        <button className='clearButton' onClick={(event) => handleClear(event, 'minDate')}>
                            <img src={closeIcon} alt='Clear' />
                        </button>

                        <label>To</label>
                        <input id='maxDate' type='date' />
                        <button className='clearButton' onClick={(event) => handleClear(event, 'maxDate')}>
                            <img src={closeIcon} alt='Clear' />
                        </button>
                    </div>
                    <input type='submit' value='Search' />
                </fieldset>
            </div>

            <fieldset id='resultsHeader' disabled={disabled}>
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
                    <p>{records}</p>
                    <p>{pages}</p>
                    <div id='resultsPageSelector'>
                        <button className='pageIncrementButton' onClick={() => setPage(Math.max(1, page - 1))}>
                            <img src={chevronLeftIcon} alt='Prev' />
                        </button>
                        <input
                            id='resultsPage'
                            type='number'
                            value={page}
                            min={1}
                            max={pageMax}
                            onChange={(event) => setPage(parseInt(event.target.value))}
                        />
                        <button className='pageIncrementButton' onClick={() => setPage(Math.min(pageMax, page + 1))}>
                            <img src={chevronRightIcon} alt='Next' />
                        </button>
                    </div>
                </div>
            </fieldset>

            <div id='resultsContainer'>
                <OccurrencesPanel occurrences={results?.data ?? []} />
            </div>
        </DashboardContainer>
    )
}