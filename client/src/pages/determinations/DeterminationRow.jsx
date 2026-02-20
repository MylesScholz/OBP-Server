import { useRef, useState } from 'react'
import axios from 'axios'

import QueriedSelection from './QueriedSelection.jsx'
import { useAuth } from '../../AuthProvider.jsx'
import { useFlow } from '../../FlowProvider'

export default function DeterminationRow({ row, unsubmitted, setUnsubmitted }) {
    const blankDetermination = {
        // Handle 'fieldNumber' separately to avoid overwriting it
        'sampleId': '',
        'specimenId': '',
        'verbatimEventDate': '',
        'url': '',
        'familyVolDet': '',
        'genusVolDet': '',
        'speciesVolDet': '',
        'sexVolDet': '',
        'casteVolDet': ''
    }
    const [ determination, setDetermination ] = useState(blankDetermination)
    const [ fieldNumber, setFieldNumber ] = useState('')
    const edited = useRef(false)
    const { volunteer } = useAuth()
    const { query } = useFlow()
    
    /* Handler Functions */

    async function onFieldNumberChange(event) {
        const url = new URL('http://server/api/occurrences')
        const params = url.searchParams
        params.set('userLogin', volunteer)
        params.set('fieldNumber', event.target.value)

        const response = await axios.get(url.pathname + url.search).catch((error) => console.error(error))

        const occurrence = response?.data?.data?.at(0)
        if (occurrence) {
            const newDetermination = {}
            Object.keys(determination).forEach((field) => newDetermination[field] = occurrence[field])
            setDetermination(newDetermination)
        } else {
            setDetermination(blankDetermination)
        }
    }

    /* QueriedSelection Query Functions */

    /*
     * fieldNumberQuery()
     * Uses the /occurrences q query parameter to get field numbers matching a given query string
     */
    async function fieldNumberQuery(fieldNumber) {
        if (!fieldNumber) return []

        const url = new URL(`http://server/api/occurrences${query.searchParams}`)
        const params = url.searchParams
        params.set('page_size', 5000)
        params.set('q', fieldNumber)

        const response = await axios.get(url.pathname + url.search).catch((error) => console.error(error))

        const fieldNumbers = response?.data?.data?.map((occurrence) => occurrence['fieldNumber']) ?? []

        return fieldNumbers
    }

    // TODO: bee taxonomy query function

    return (
        <>
            <p>{row + 1}</p>
            <QueriedSelection
                inputId={`fieldNumber${row}`}
                value={fieldNumber}
                setValue={(value) => {
                    setFieldNumber(value)
                    if (!edited.current) setUnsubmitted((unsubmitted || 0) + 1)
                    edited.current = true
                }}
                queryFn={fieldNumberQuery}
                onChange={onFieldNumberChange}
            />
            <p id={`sampleId${row}`}>{determination['sampleId']}</p>
            <p id={`specimenId${row}`}>{determination['specimenId']}</p>
            <p id={`verbatimEventDate${row}`}>{determination['verbatimEventDate']}</p>
            <p id={`url${row}`}>{determination['url']}</p>
            <QueriedSelection
                inputId={`familyVolDet${row}`}
                value={determination['familyVolDet']}
                setValue={(value) => {
                    setDetermination({ ...determination, 'familyVolDet': value })
                    if (!edited.current) setUnsubmitted((unsubmitted || 0) + 1)
                    edited.current = true
                }}
                queryFn={() => []}
            />
            <QueriedSelection
                inputId={`genusVolDet${row}`}
                value={determination['genusVolDet']}
                setValue={(value) => {
                    setDetermination({ ...determination, 'genusVolDet': value })
                    if (!edited.current) setUnsubmitted((unsubmitted || 0) + 1)
                    edited.current = true
                }}
                queryFn={() => []}
            />
            <QueriedSelection
                inputId={`speciesVolDet${row}`}
                value={determination['speciesVolDet']}
                setValue={(value) => {
                    setDetermination({ ...determination, 'speciesVolDet': value })
                    if (!edited.current) setUnsubmitted((unsubmitted || 0) + 1)
                    edited.current = true
                }}
                queryFn={() => []}
            />
            <QueriedSelection
                inputId={`sexVolDet${row}`}
                value={determination['sexVolDet']}
                setValue={(value) => {
                    setDetermination({ ...determination, 'sexVolDet': value })
                    if (!edited.current) setUnsubmitted((unsubmitted || 0) + 1)
                    edited.current = true
                }}
                queryFn={() => []}
            />
            <QueriedSelection
                inputId={`casteVolDet${row}`}
                value={determination['casteVolDet']}
                setValue={(value) => {
                    setDetermination({ ...determination, 'casteVolDet': value })
                    if (!edited.current) setUnsubmitted((unsubmitted || 0) + 1)
                    edited.current = true
                }}
                queryFn={() => []}
            />
        </>
    )
}