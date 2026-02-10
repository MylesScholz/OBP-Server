import { useEffect, useRef, useState } from 'react'
import styled from '@emotion/styled'
import axios from 'axios'

import DashboardSearchPanel from './DashboardSearchPanel'
import DashboardUploadPanel from './DashboardUploadPanel'
import DashboardResultsHeader from './DashboardResultsHeader'
import OccurrencesPanel from '../../components/OccurrencesPanel'
import { useFlow } from '../../FlowProvider'
import { useAuth } from '../../AuthProvider'

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

        overflow: hidden;
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

            select {
                border: 1px solid gray;
                border-radius: 5px;

                height: 25px;

                background-color: white;
            
                &:hover {
                    background-color: #efefef;
                }
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

                        border: 1px solid gray;
                        border-radius: 5px;

                        padding: 5px;

                        width: 50px;

                        font-size: 10pt;

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

                        border: 1px solid gray;
                        border-radius: 5px;

                        padding: 0px;

                        width: 32px;
                        height: 32px;

                        background-color: white;

                        &:hover {
                            background-color: #efefef;
                        }
                        
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
    const { admin } = useAuth()
    const hasSubmitted = useRef(false)
    const submitRef = useRef()

    useEffect(() => {
        if(hasSubmitted.current) return
        handleSubmit()
        hasSubmitted.current = true
    }, [])

    function handleEnter(event) {
        event.preventDefault()

        const element = submitRef.current
        if (!element) return

        element.click()
    }

    function handleSubmit (event) {
        event?.preventDefault()
        setDisabled(true)

        const url = new URL(`http://server/api/occurrences`)
        const params = url.searchParams

        params.set('page', query.page.toString())
        params.set('per_page', query.per_page.toString())
        params.set('sort_by', query.sort_by)
        params.set('sort_dir', query.sort_dir)

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
                <DashboardSearchPanel submitRef={submitRef} disabled={disabled} />
                { admin && <DashboardUploadPanel disabled={disabled} /> }
            </div>

            <DashboardResultsHeader handleEnter={handleEnter} disabled={disabled} />

            <div id='resultsContainer'>
                <OccurrencesPanel occurrences={results?.data ?? []} />
            </div>
        </DashboardForm>
    )
}