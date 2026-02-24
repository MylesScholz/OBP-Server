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
    const [ errors, setErrors ] = useState({})
    const [ fieldNumber, setFieldNumber ] = useState('')
    const edited = useRef(false)
    const { volunteer } = useAuth()
    const { query } = useFlow()

    // Updates the errors object from a given taxonomy query response
    function updateErrors(taxonomyResponse) {
        if (!taxonomyResponse) return

        const taxonomyError = taxonomyResponse.taxonomy?.error
        const sexCasteError = taxonomyResponse.sexCaste?.error
        const newErrors = {}
        if (taxonomyError) newErrors[taxonomyError.rank] = taxonomyError.message
        if (sexCasteError) newErrors[sexCasteError.field] = sexCasteError.message
        setErrors(newErrors)
    }
    
    /* Handler Functions */

    async function onFieldNumberChange(event) {
        const url = new URL('http://server/api/occurrences')
        const params = url.searchParams
        params.set('userLogin', volunteer)
        params.set('fieldNumber', event.target.value)

        // Query an exact match of the given fieldNumber
        const response = await axios.get(url.pathname + url.search).catch((error) => console.error(error))

        // Only take the first result
        const occurrence = response?.data?.data?.at(0)
        if (occurrence) {
            // Set this row's fields to the queried values (via the determination state object)
            const newDetermination = {}
            Object.keys(determination).forEach((field) => newDetermination[field] = occurrence[field])

            // If all taxonomy fields are blank, try to copy down the values from the previous row
            const taxonomyFields = [ 'familyVolDet', 'genusVolDet', 'speciesVolDet', 'sexVolDet', 'casteVolDet' ]
            if (taxonomyFields.every((field) => !newDetermination[field])) {
                // For each taxonomy field, query the element in the previous row by ID
                taxonomyFields.forEach((field) => newDetermination[field] = document.getElementById(`${field}${Math.max(row - 1, 0)}`)?.value ?? '')
            }

            setDetermination(newDetermination)

            // Query new taxonomy fields and update error fields
            const response = await taxonomyQuery(
                newDetermination['familyVolDet'],
                newDetermination['genusVolDet'],
                newDetermination['speciesVolDet'],
                newDetermination['sexVolDet'],
                newDetermination['casteVolDet']
            )
            updateErrors(response)
        } else {
            setDetermination(blankDetermination)
        }
    }

    /* QueriedSelection Query Functions */

    /*
     * fieldNumberQuery()
     * Uses the /api/occurrences q query parameter to get field numbers matching a given query string
     */
    async function fieldNumberQuery(fieldNumber) {
        const url = new URL(`http://server/api/occurrences${query.searchParams}`)
        const params = url.searchParams
        params.set('page_size', 5000)
        params.set('q', fieldNumber ?? '')

        const response = await axios.get(url.pathname + url.search).catch((error) => console.error(error))

        const fieldNumbers = response?.data?.data?.map((occurrence) => occurrence['fieldNumber']) ?? []

        return fieldNumbers
    }

    /*
     * taxonomyQuery()
     * Queries /api/taxonomy with the given query parameters
     */
    async function taxonomyQuery(family, genus, species, sex, caste) {
        const url = new URL(`http://server/api/taxonomy`)
        const params = url.searchParams
        if (family) params.set('family', family)
        if (genus) params.set('genus', genus)
        if (species) params.set('species', species)
        if (sex) params.set('sex', sex)
        if (caste) params.set('caste', caste)

        const response = await axios.get(url.pathname + url.search).catch((error) => console.error(error))

        // Set taxonomy and sex-caste errors
        updateErrors(response?.data)

        return response?.data ?? {}
    }

    async function familyQuery(family) {
        const response = await taxonomyQuery(
            family,
            determination['genusVolDet'],
            determination['speciesVolDet'],
            determination['sexVolDet'],
            determination['casteVolDet']
        )

        return response.taxonomy?.family ?? []
    }

    async function genusQuery(genus) {
        const response = await taxonomyQuery(
            determination['familyVolDet'],
            genus,
            determination['speciesVolDet'],
            determination['sexVolDet'],
            determination['casteVolDet']
        )

        return response.taxonomy?.genus ?? []
    }

    async function speciesQuery(species) {
        const response = await taxonomyQuery(
            determination['familyVolDet'],
            determination['genusVolDet'],
            species,
            determination['sexVolDet'],
            determination['casteVolDet']
        )

        return response.taxonomy?.species ?? []
    }

    async function sexQuery(sex) {
        const response = await taxonomyQuery(
            determination['familyVolDet'],
            determination['genusVolDet'],
            determination['speciesVolDet'],
            sex,
            determination['casteVolDet']
        )

        return response.sexCaste?.sex ?? []
    }

    async function casteQuery(caste) {
        const response = await taxonomyQuery(
            determination['familyVolDet'],
            determination['genusVolDet'],
            determination['speciesVolDet'],
            determination['sexVolDet'],
            caste
        )

        return response.sexCaste?.caste ?? []
    }

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
                error={errors['family']}
                setValue={(value) => {
                    setDetermination({ ...determination, 'familyVolDet': value })
                    if (!edited.current) setUnsubmitted((unsubmitted || 0) + 1)
                    edited.current = true
                }}
                queryFn={familyQuery}
            />
            <QueriedSelection
                inputId={`genusVolDet${row}`}
                value={determination['genusVolDet']}
                error={errors['genus']}
                setValue={(value) => {
                    setDetermination({ ...determination, 'genusVolDet': value })
                    if (!edited.current) setUnsubmitted((unsubmitted || 0) + 1)
                    edited.current = true
                }}
                queryFn={genusQuery}
            />
            <QueriedSelection
                inputId={`speciesVolDet${row}`}
                value={determination['speciesVolDet']}
                error={errors['species']}
                setValue={(value) => {
                    setDetermination({ ...determination, 'speciesVolDet': value })
                    if (!edited.current) setUnsubmitted((unsubmitted || 0) + 1)
                    edited.current = true
                }}
                queryFn={speciesQuery}
            />
            <QueriedSelection
                inputId={`sexVolDet${row}`}
                value={determination['sexVolDet']}
                error={errors['sex']}
                setValue={(value) => {
                    setDetermination({ ...determination, 'sexVolDet': value })
                    if (!edited.current) setUnsubmitted((unsubmitted || 0) + 1)
                    edited.current = true
                }}
                queryFn={sexQuery}
            />
            <QueriedSelection
                inputId={`casteVolDet${row}`}
                value={determination['casteVolDet']}
                error={errors['caste']}
                setValue={(value) => {
                    setDetermination({ ...determination, 'casteVolDet': value })
                    if (!edited.current) setUnsubmitted((unsubmitted || 0) + 1)
                    edited.current = true
                }}
                queryFn={casteQuery}
            />
        </>
    )
}