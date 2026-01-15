import { useEffect, useRef, useState } from 'react'
import styled from '@emotion/styled'
import axios from 'axios'

import chevronLeftIcon from '/src/assets/chevron_left.svg'
import chevronRightIcon from '/src/assets/chevron_right.svg'
import closeIcon from '/src/assets/close.svg'
import { OccurrencesPanel } from '../../components/OccurrencesPanel'
import DownloadButton from './DownloadButton'
import { useFlow } from '../../FlowProvider'

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
        border-radius: 5px;

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
        border-radius: 5px;

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

        #resultsHeaderRight {
            display: flex;
            flex-direction: row;
            justify-content: space-between;
            align-items: center;
            gap: 15px;

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

            #downloadResults {
                display: flex;
                justify-content: center;
                align-items: center;
            }
        }
    }

    #resultsContainer {
        border: 1px solid #222;
    }
`

export default function Dashboard() {
    const [ disabled, setDisabled ] = useState(false)
    const { query, setQuery, results, setResults } = useFlow()
    const hasSubmitted = useRef(false)
    
    // The URL or IP address of the backend server
    const serverAddress = `${import.meta.env.VITE_SERVER_HOST || 'localhost'}`
    // Occurrence field names
    const fieldNames = [
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

    let pageMax = results?.pagination?.totalPages ? results?.pagination?.totalPages : 0
    let currentPage = results?.pagination?.currentPage ?? 1
    let pageLength = results?.data?.length ?? 0
    let totalDocuments = results?.pagination?.totalDocuments ?? 0

    const recordsText = `Showing ${pageLength.toLocaleString('en-US')} of ${totalDocuments.toLocaleString('en-US')} records`
    const pagesText = `Page ${currentPage.toLocaleString('en-US')} of ${pageMax.toLocaleString('en-US')}`

    useEffect(() => {
        if(hasSubmitted.current) return
        handleSubmit()
        hasSubmitted.current = true
    }, [])

    useEffect(() => {
        if (currentPage > pageMax) {
            setQuery({ ...query, page: 1 })
        }
    }, [results])

    function handleClear(event, key) {
        event.preventDefault()

        setQuery({ ...query, [key]: '' })
    }

    function handleEnter(event) {
        event.preventDefault()

        document.getElementById('dashboardSubmitButton').click()
    }

    function handleSubmit (event) {
        event?.preventDefault()
        setDisabled(true)

        const url = new URL(`http://${serverAddress}/api/occurrences`)
        const params = url.searchParams

        params.set('page', query.page.toString())
        params.set('per_page', query.per_page.toString())

        if (query.fieldName) {
            params.set(query.fieldName, query.queryText)
        }

        if (query.minDate) params.set('start_date', query.minDate)
        if (query.maxDate) params.set('end_date', query.maxDate)

        axios.get(url.toString()).then((res) => {
            setResults(res.data)
            setDisabled(false)
        }).catch((error) => {
            console.error(error)
            setResults({ error })
            setDisabled(false)
        }).finally(() => {
            // Remove pagination params before setting query.url (not relevant to data selection)
            params.delete('page')
            params.delete('per_page')
            setQuery({ ...query, url: url.toString() })
        })
    }

    return (
        <DashboardContainer onSubmit={ handleSubmit }>
            <div id='toolBar'>
                <fieldset id='searchFilters' disabled={disabled}>
                    <h3>Search Records</h3>
                    <div id='matchFieldFilter'>
                        <p>Match Field</p>

                        <select
                            id='fieldName'
                            value={query.fieldName}
                            onChange={(event) => setQuery({...query, fieldName: event.target.value})}
                        >
                            <option key='select' value=''>Select a field to match...</option>
                            {fieldNames.map((fieldName) => <option key={fieldName} value={fieldName}>{fieldName}</option>)}
                        </select>
                        <button className='clearButton' onClick={(event) => handleClear(event, 'fieldName')}>
                            <img src={closeIcon} alt='Clear' />
                        </button>

                        <input
                            id='queryText'
                            type='text'
                            placeholder='Enter a query...'
                            value={query.queryText}
                            onKeyDown={(event) => { if (event.key === 'Enter') handleEnter(event) }}
                            onChange={(event) => setQuery({ ...query, queryText: event.target.value })}
                        />
                        <button className='clearButton' onClick={(event) => handleClear(event, 'queryText')}>
                            <img src={closeIcon} alt='Clear' />
                        </button>
                    </div>
                    <div id='dateFilter'>
                        <p>Date</p>

                        <label>From</label>
                        <input
                            id='minDate'
                            type='date'
                            value={query.minDate}
                            onKeyDown={(event) => { if (event.key === 'Enter') handleEnter(event) }}
                            onChange={(event) => setQuery({ ...query, minDate: event.target.value })}
                        />
                        <button className='clearButton' onClick={(event) => handleClear(event, 'minDate')}>
                            <img src={closeIcon} alt='Clear' />
                        </button>

                        <label>To</label>
                        <input
                            id='maxDate'
                            type='date'
                            value={query.maxDate}
                            onKeyDown={(event) => { if (event.key === 'Enter') handleEnter(event) }}
                            onChange={(event) => setQuery({ ...query, maxDate: event.target.value })}
                        />
                        <button className='clearButton' onClick={(event) => handleClear(event, 'maxDate')}>
                            <img src={closeIcon} alt='Clear' />
                        </button>
                    </div>
                    <button id='dashboardSubmitButton' type='submit' value='search'>Search</button>
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
                <div id='resultsHeaderRight'>
                    <div id='resultsPagination'>
                        <p>{recordsText} ({pagesText})</p>
                        <div id='resultsPageSelector'>
                            <button className='pageIncrementButton' onClick={() => setQuery({ ...query, page: Math.max(1, query.page - 1) })}>
                                <img src={chevronLeftIcon} alt='Prev' />
                            </button>
                            <input
                                id='resultsPage'
                                type='number'
                                value={query.page}
                                min={1}
                                max={Math.max(pageMax, 1)}
                                onKeyDown={(event) => { if (event.key === 'Enter') handleEnter(event) }}
                                onChange={(event) => setQuery({ ...query, page: parseInt(event.target.value) })}
                            />
                            <button className='pageIncrementButton' onClick={() => setQuery({ ...query, page: Math.max(1, (query.page + 1) % Math.max(pageMax + 1, 1)) })}>
                                <img src={chevronRightIcon} alt='Next' />
                            </button>
                        </div>
                    </div>
                    <div id='downloadResults'>
                        <DownloadButton queryUrl={query.url} />
                    </div>
                </div>
            </fieldset>

            <div id='resultsContainer'>
                <OccurrencesPanel occurrences={results?.data ?? []} />
            </div>
        </DashboardContainer>
    )
}