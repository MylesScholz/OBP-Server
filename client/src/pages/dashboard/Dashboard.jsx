import { useEffect, useRef, useState } from 'react'
import styled from '@emotion/styled'
import axios from 'axios'

import chevronLeftIcon from '/src/assets/chevron_left.svg'
import chevronRightIcon from '/src/assets/chevron_right.svg'
import OccurrencesPanel from '../../components/OccurrencesPanel'
import DashboardSearchPanel from './DashboardSearchPanel'
import DownloadButton from './DownloadButton'
import { useFlow } from '../../FlowProvider'
import DashboardUploadPanel from './DashboardUploadPanel'

const DashboardForm = styled.form`
    display: grid;
    grid-template-columns: 350px minmax(0, 1fr);
    grid-template-rows: 55px 1fr;
    grid-column-gap: 15px;
    grid-row-gap: 15px;

    #toolBar {
        grid-row: 1 / 3;

        display: flex;
        flex-direction: column;
        align-items: stretch;
        gap: 15px;

        border: 1px solid #222;
        border-radius: 5px;

        padding: 15px;

        overflow-y: scroll;
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

    function handleEnter(event) {
        event.preventDefault()

        document.getElementById('dashboardSubmitButton').click()
    }

    function handleSubmit (event) {
        event?.preventDefault()
        setDisabled(true)

        const url = new URL(`http://server/api/occurrences`)
        const params = url.searchParams

        params.set('page', query.page.toString())
        params.set('per_page', query.per_page.toString())

        for (const [ fieldName, values ] of Object.entries(query.valueQueries)) {
            params.set(fieldName, values)
        }

        if (query.start_date) params.set('start_date', query.start_date)
        if (query.end_date) params.set('end_date', query.end_date)

        axios.get(url.pathname + url.search).then((res) => {
            setResults(res.data)
            setDisabled(false)
        }).catch((error) => {
            console.error(error)
            setResults({ error })
            setDisabled(false)
        }).finally(() => {
            // Remove pagination params before setting query.searchParams (not relevant to data selection)
            params.delete('page')
            params.delete('per_page')
            setQuery({ ...query, searchParams: url.search, unsubmitted: false })
        })
    }

    return (
        <DashboardForm onSubmit={ handleSubmit }>
            <div id='toolBar'>
                <DashboardSearchPanel disabled={disabled} />
                <DashboardUploadPanel disabled={disabled} />
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
                        <DownloadButton searchParams={query.searchParams} />
                    </div>
                </div>
            </fieldset>

            <div id='resultsContainer'>
                <OccurrencesPanel occurrences={results?.data ?? []} />
            </div>
        </DashboardForm>
    )
}