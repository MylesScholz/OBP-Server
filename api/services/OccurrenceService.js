import Crypto from 'node:crypto'

import { OccurrenceRepository } from '../repositories/index.js'
import { fieldNames, template, nonEmptyFields, ofvs, abbreviations } from '../utils/constants.js'
import { includesStreetSuffix, getDayOfYear, getOFV } from '../utils/utilities.js'
import PlacesService from './PlacesService.js'
import TaxaService from './TaxaService.js'
import UsernamesService from './UsernamesService.js'
import ElevationService from './ElevationService.js'
import FileManager from '../utils/FileManager.js'


class OccurrenceService {
    constructor() {
        this.repository = new OccurrenceRepository()
    }

    /* Helper Methods */
    
    /*
     * updateErrorFlags()
     * Checks a given occurrence for errors and updates the errorFlags field
     */
    updateErrorFlags(occurrence) {
        const updatedOccurrence = { ...occurrence }

        // A list of fields to flag in addition to the non-empty fields
        let errorFields = []

        // Flag country and state if they are too long (unabbreviated)
        if (updatedOccurrence[fieldNames.country]?.length > 3) { errorFields.push(fieldNames.country) }
        if (updatedOccurrence[fieldNames.stateProvince]?.length > 2) { errorFields.push(fieldNames.stateProvince) }

        // Flag locality if it contains street suffixes or is too long
        if (includesStreetSuffix(updatedOccurrence[fieldNames.locality]) || updatedOccurrence[fieldNames.locality]?.length > 18) {
            errorFields.push(fieldNames.locality)
        }

        // Flag accuracy if it is greater than 250 meters
        if (parseInt(updatedOccurrence[fieldNames.accuracy]) > 250) { errorFields.push(fieldNames.accuracy) }    

        // Flag plantPhylum if it is defined but is not 'tracheophyta'
        if (!!updatedOccurrence[fieldNames.plantPhylum] && updatedOccurrence[fieldNames.plantPhylum]?.toLowerCase() !== 'tracheophyta') {
            errorFields.push(fieldNames.plantPhylum)
        }

        // Set errorFlags as a semicolon-separated list of fields (non-empty fields and additional flags)
        updatedOccurrence[fieldNames.errorFlags] = nonEmptyFields.filter((field) => !updatedOccurrence[field]).concat(errorFields).join(';')

        return updatedOccurrence
    }

    /*
     * generateOccurrenceId()
     * Creates a unique key string for a given formatted occurrence
     */
    generateOccurrenceId(occurrence) {
        // Uniquely identify an occurrence with sample ID, specimen ID, day, month, year, and iNaturalist URL
        // If there is no URL, use first name and last name too.
        const keyFields = [fieldNames.sampleId, fieldNames.specimenId, fieldNames.day, fieldNames.month, fieldNames.year, fieldNames.iNaturalistUrl]
        if (!occurrence[fieldNames.iNaturalistUrl]) {
            keyFields.push(fieldNames.firstName)
            keyFields.push(fieldNames.lastName)
        }

        // Get a list of the corresponding values for the key fields
        const keyValues = keyFields.map((field) => String(occurrence[field] || ''))

        // Combine and hash the key values into a single unique key string
        const compositeKey = Crypto.createHash('sha256')
            .update(keyValues.join(','))
            .digest('hex')
        
        return compositeKey
    }

    /*
     * formatOccurrence()
     * Applies basic formatting to an occurrence
     */
    formatOccurrence(occurrence) {
        // The final field set should be a union of the standard template and the given row
        // The given row's values will overwrite the template's values
        let formattedOccurrence = Object.assign({}, template, occurrence)

        // Fill occurrenceId and resourceId if state is 'OR' and fieldNumber is defined
        if (formattedOccurrence[fieldNames.fieldNumber] && formattedOccurrence[fieldNames.stateProvince] === 'OR') {
            formattedOccurrence[fieldNames.occurrenceId] ||= `https://osac.oregonstate.edu/OBS/OBA_${formattedOccurrence[fieldNames.fieldNumber]}`
            formattedOccurrence[fieldNames.resourceId] ||= formattedOccurrence[fieldNames.occurrenceId]
        }

        // Fill recordedBy if empty
        const firstName = formattedOccurrence[fieldNames.firstName] ?? ''
        const lastName = formattedOccurrence[fieldNames.lastName] ?? ''
        formattedOccurrence[fieldNames.recordedBy] ||= `${firstName}${(firstName && lastName) ? ' ' : ''}${lastName}`

        // Set verbatimDate to default formatting
        formattedOccurrence[fieldNames.verbatimDate] = formattedOccurrence[fieldNames.day] && formattedOccurrence[fieldNames.month] && formattedOccurrence[fieldNames.year]
            ? `${formattedOccurrence[fieldNames.month]}/${formattedOccurrence[fieldNames.day]}/${formattedOccurrence[fieldNames.year]}`
            : ''

        // Fill startDayOfYear and endDayOfYear if day2, month2, and year2 are defined
        // Overwrite verbatimDate with two-date format
        if (!!formattedOccurrence[fieldNames.day2] && !!formattedOccurrence[fieldNames.month2] && !!formattedOccurrence[fieldNames.year2]) {
            const day1 = parseInt(formattedOccurrence[fieldNames.day])
            // Convert month to its index (subtract 1)
            const month1Index = parseInt(formattedOccurrence[fieldNames.month]) - 1
            const year1 = parseInt(formattedOccurrence[fieldNames.year])
            // Set the time to noon to avoid timezone errors
            const date1 = new Date(year1, month1Index, day1, 12)

            formattedOccurrence[fieldNames.startDayOfYear] = getDayOfYear(date1)?.toString() ?? ''

            const day2 = parseInt(formattedOccurrence[fieldNames.day2])
            // Convert month to its index (subtract 1)
            const month2Index = parseInt(formattedOccurrence[fieldNames.month2]) - 1
            const year2 = parseInt(formattedOccurrence[fieldNames.year2])
            // Set the time to noon to avoid timezone errors
            const date2 = new Date(year2, month2Index, day2, 12)

            formattedOccurrence[fieldNames.endDayOfYear] = getDayOfYear(date2)?.toString() ?? ''

            formattedOccurrence[fieldNames.verbatimDate] = `${formattedOccurrence[fieldNames.year]}-${formattedOccurrence[fieldNames.month]}-${formattedOccurrence[fieldNames.day]}/${formattedOccurrence[fieldNames.year2]}-${formattedOccurrence[fieldNames.month2]}-${formattedOccurrence[fieldNames.day2]}`
        }

        // Enforce county abbreviations
        const county = formattedOccurrence[fieldNames.county] ?? ''
        formattedOccurrence[fieldNames.county] = abbreviations.counties[county] ?? county

        // Enforce 4-decimal-point latitude and longitude
        const latitude = parseFloat(formattedOccurrence[fieldNames.latitude])
        const longitude = parseFloat(formattedOccurrence[fieldNames.longitude])
        formattedOccurrence[fieldNames.latitude] = !isNaN(latitude) ? latitude.toFixed(4).toString() : formattedOccurrence[fieldNames.latitude]
        formattedOccurrence[fieldNames.longitude] = !isNaN(longitude) ? longitude.toFixed(4).toString() : formattedOccurrence[fieldNames.longitude]

        // Set error flags
        formattedOccurrence = this.updateErrorFlags(formattedOccurrence)

        // Generate a unique ID for the occurrence and add it as the _id field
        formattedOccurrence._id = this.generateOccurrenceId(formattedOccurrence)

        return formattedOccurrence
    }

    /* Main Methods */

    /*
     * createOccurrence
     * Inserts a single occurrence into the database with optional formatting
     */
    async createOccurrence(document, skipFormatting = false) {
        // Return object containing information about inserted and duplicate occurrences
        const results = {
            insertedCount: 0,
            insertedIds: [],
            duplicates: []
        }

        // Apply formatting
        const occurrence = this.formatOccurrence(document)

        // Check if a occurrence with the same _id already exists; insert the occurrence if not
        const existing = await this.repository.findById(occurrence._id)
        if (existing) {
            results.duplicates.push(occurrence)
        } else {
            const response = await this.repository.create(occurrence)
            results.insertedCount = 1
            results.insertedIds = response
        }

        return results
    }

    /*
     * createOccurrences()
     * Inserts multiple occurrences into the database with optional formatting
     */
    async createOccurrences(documents, skipFormatting = false) {
        // Return object containing information about inserted and duplicate occurrences
        const results = {
            insertedCount: 0,
            insertedIds: [],
            duplicates: []
        }

        // Apply formatting (unless skipped)
        const occurrences = skipFormatting ? documents : documents?.map((doc) => this.formatOccurrence(doc))

        // Return if no documents were provided
        if (!occurrences || occurrences.length === 0) return results

        try {
            const response = await this.repository.createMany(occurrences)

            results.insertedCount = Object.values(response).length
            results.insertedIds = Object.values(response)
        } catch (error) {
            if (error.name === 'MongoBulkWriteError') {
                // Capture successfully inserted occurrence data
                if (error.result && error.result.insertedCount) {
                    results.insertedCount = error.result.insertedCount
                    results.insertedIds = Object.values(error.result.insertedIds)
                }

                // Capture duplicate data
                error.writeErrors?.forEach((writeError) => {
                    if (writeError.code === 11000 && writeError.err?.op) {  // Mongo Server E11000 duplicate key error
                        results.duplicates.push(writeError.err.op)
                    }
                })
            } else {
                throw error
            }
        }

        return results
    }

    /*
     * createOccurrencesFromFile()
     * Reads a given occurrences file chunk-by-chunk and inserts formatted occurrences for each entry
     */
    async createOccurrencesFromFile(filePath) {
        const chunkSize = 5000
        // Return object containing information about inserted and duplicate occurrences
        const results = {
            insertedCount: 0,
            insertedIds: [],
            duplicates: []
        }

        for await (const chunk of FileManager.readCSVChunks(filePath, chunkSize)) {
            const chunkResults = await this.createOccurrences(chunk)
            
            // Add the results for this chunk to the running total
            results.insertedCount += chunkResults.insertedCount
            results.insertedIds = results.insertedIds.concat(chunkResults.insertedIds)
            results.duplicates = results.duplicates.concat(chunkResults.duplicates)
        }

        return results
    }

    /*
     * createOccurrenceFromObservation()
     * Creates a formatted occurrence from an iNaturalist observation (and place, taxonomy, elevation, and user data); does not insert the occurrence
     */
    createOccurrenceFromObservation(observation, elevations) {
        // Return if no observation is provided
        if (!observation) return

        // Start from the template occurrence object
        let occurrence = Object.assign({}, template)

        // Tag this occurrence as new
        occurrence.new = true

        /* Constants */

        // Parse user's name
        let { firstName, firstNameInitial, lastName } = UsernamesService.getUserName(observation.user?.login)

        // Look up the plant ancestry and format it
        const plantAncestry = TaxaService.getPlantAncestry(observation.taxon)

        // Parse country, state/province, and county
        const { country, stateProvince, county } =  PlacesService.getPlaceNames(observation.place_ids)

        /* Formatted fields as constants */

        // Find the observation field values (OFVs) for sampleId and number of bees collected (which will become specimenId)
        const rawSampleId = getOFV(observation.ofvs, ofvs.sampleId)
        const rawSpecimenId = getOFV(observation.ofvs, ofvs.beesCollected)
        const sampleId = !isNaN(parseInt(rawSampleId)) ? parseInt(rawSampleId).toString() : ''
        const specimenId = !isNaN(parseInt(rawSpecimenId)) ? parseInt(rawSpecimenId).toString() : ''

        // Attempt to parse observed_on as a JavaScript Date object
        const observedDate = observation.observed_on ? new Date(observation.observed_on) : undefined

        // Extract the day, month, and year from the Date object
        const observedDay = observedDate?.getUTCDate()
        const observedMonth = observedDate?.getUTCMonth() + 1
        const observedYear = observedDate?.getUTCFullYear()

        // Format the day, month, and year
        const formattedDay = !isNaN(observedDay) ? observedDay.toString() : ''
        const formattedMonth = !isNaN(observedMonth) ? observedMonth.toString() : ''
        const formattedYear = !isNaN(observedYear) ? observedYear.toString() : ''
        
        // Format the location
        // Remove 'County' or 'Co' or 'Co.' from the county field (case insensitive)
        const countyRegex = new RegExp(/(?<![^,.\s])Co(?:unty)?\.?(?![^,.\s])+/ig)
        const formattedLocality = observation.place_guess?.split(/,\s*/)?.at(0)?.replace(countyRegex, '')?.trim() ?? ''

        // Format the coordinates
        const formattedLatitude = observation.geojson?.coordinates?.at(1)?.toFixed(4)?.toString() ?? ''
        const formattedLongitude = observation.geojson?.coordinates?.at(0)?.toFixed(4)?.toString() ?? ''

        /* Final formatting */

        occurrence[fieldNames.iNaturalistId] = observation.user?.id?.toString() ?? ''
        occurrence[fieldNames.iNaturalistAlias] = observation.user?.login ?? ''

        if (observation.user?.login === 'pandg' && observedYear >= 2021) {
            if (parseInt(sampleId) > 100) {
                firstName = 'Gretchen'
                firstNameInitial = 'G.'
            } else if (parseInt(sampleId) <= 100) {
                firstName = 'Robert'
                firstNameInitial = 'R.'
            }
        }

        occurrence[fieldNames.firstName] = firstName
        occurrence[fieldNames.firstNameInitial] = firstNameInitial
        occurrence[fieldNames.lastName] = lastName
        occurrence[fieldNames.recordedBy] = `${firstName}${(firstName && lastName) ? ' ' : ''}${lastName}`

        occurrence[fieldNames.sampleId] = sampleId
        occurrence[fieldNames.specimenId] = specimenId

        occurrence[fieldNames.day] = formattedDay
        occurrence[fieldNames.month] = formattedMonth
        occurrence[fieldNames.year] = formattedYear
        occurrence[fieldNames.verbatimDate] =  formattedDay && formattedMonth && formattedYear ? `${formattedMonth}/${formattedDay}/${formattedYear}` : ''
        
        occurrence[fieldNames.country] = abbreviations.countries[country] ?? country
        occurrence[fieldNames.stateProvince] = abbreviations.stateProvinces[stateProvince] ?? stateProvince
        occurrence[fieldNames.county] = county
        occurrence[fieldNames.locality] = formattedLocality

        const coordinate = `${formattedLatitude},${formattedLongitude}`
        occurrence[fieldNames.elevation] = elevations[coordinate] || ''

        occurrence[fieldNames.latitude] = formattedLatitude
        occurrence[fieldNames.longitude] = formattedLongitude
        occurrence[fieldNames.accuracy] = observation.positional_accuracy?.toString() ?? ''

        occurrence[fieldNames.samplingProtocol] = 'aerial net'

        occurrence[fieldNames.resourceRelationship] = 'visits flowers of'
        occurrence[fieldNames.relatedResourceId] = observation.uuid

        occurrence[fieldNames.plantPhylum] = plantAncestry.phylum
        occurrence[fieldNames.plantOrder] = plantAncestry.order
        occurrence[fieldNames.plantFamily] = plantAncestry.family
        occurrence[fieldNames.plantGenus] = plantAncestry.genus
        occurrence[fieldNames.plantSpecies] = plantAncestry.species

        // As a fallback, search the plant ancestry upward for the first truthy rank
        const minRank = ['species', 'genus', 'family', 'order', 'phylum'].find((rank) => !!plantAncestry[rank])
        occurrence[fieldNames.plantTaxonRank] = observation.taxon?.rank || minRank || ''

        occurrence[fieldNames.iNaturalistUrl] = observation.uri ?? ''

        // Set error flags
        occurrence = this.updateErrorFlags(occurrence)

        return occurrence
    }

    async getOccurrences(filter = {}, options = {}) {
        return await this.repository.findMany(filter, options, { 'composite_sort': 1 })
    }

    async getOccurrencesPage(options = {}) {
        const sortConfig = [ { field: 'composite_sort', direction: 1, type: 'string' } ]
        return await this.repository.paginate({ ...options, sortConfig })
    }

    async getUnindexedOccurrencesPage(options = {}) {
        // Query occurrences with empty errorFlags and fieldNumber
        const filter = {
            [fieldNames.errorFlags]: { $in: [ null, undefined, '' ] },
            [fieldNames.fieldNumber]: { $in: [ null, undefined, '' ] }
        }
        const sortConfig = [ { field: 'composite_sort', direction: 1, type: 'string' } ]
        return await this.repository.paginate({ ...options, filter, sortConfig })
    }

    /*
     * getPrintableOccurrences()
     * Returns occurrences that have not been printed and do not have error flags on a given list of required fields; optional filtering by a list of userLogins
     */
    async getPrintableOccurrences(requiredFields, userLogins) {
        // First, query occurrences with an empty dateLabelPrint field
        const filter = {
            [fieldNames.dateLabelPrint]: { $in: [ null, undefined, '' ] }
        }
        // If userLogins are given, filter by them
        if (userLogins) filter[fieldNames.iNaturalistAlias] = { $in: userLogins }

        // Filter by occurrences with all required fields
        requiredFields?.forEach((field) => filter[field] = { $nin: [ null, undefined, '' ] })
        const unprintedAndComplete = await this.repository.findMany(filter, {}, { [fieldNames.recordedBy]: 1, [fieldNames.fieldNumber]: 1 })

        // Filter out occurrences where any of the required fields show up in errorFlags
        return unprintedAndComplete.filter(
            (occurrence) => !requiredFields.some(
                (field) => occurrence[fieldNames.errorFlags]?.split(';')?.includes(field) ?? false
            )
        )
    }

    /*
     * getUnprintableOccurrences()
     * Returns occurrences that have either already been printed or that have error flags on a given list of required fields
     */
    async getUnprintableOccurrences(requiredFields) {
        const filter = {
            $or: [
                { [fieldNames.errorFlags]: { $nin: [ null, undefined, '' ] } },
                { [fieldNames.dateLabelPrint]: { $nin: [ null, undefined, '' ] } }
            ]
        }

        const printedOrIncomplete = await this.repository.findMany(filter)

        return printedOrIncomplete.filter(
            (occurrence) => requiredFields.some(
                (field) => occurrence[fieldNames.errorFlags]?.split(';')?.includes(field) ?? false
            )
        )
    }

    async getErrorFlagsByUserLogins(userLogins) {
        // Query occurrences with iNaturalistAliases in the given list of user logins and errorFlags
        // Limit the result fields to the iNaturalistAlias and errorFlags
        return await this.repository.aggregate([
            {
                $match: {
                    [fieldNames.iNaturalistAlias]: { $in: userLogins },
                    [fieldNames.errorFlags]: { $nin: [ null, undefined, '' ] }
                }
            },
            {
                $project: {
                    [fieldNames.iNaturalistAlias]: 1,
                    [fieldNames.errorFlags]: 1
                }
            }
        ])
    }

    async getStateCollectorBeeCounts(filter = {}) {
        return await this.repository.aggregate([
            {
                $match: {
                    ...filter,
                    [fieldNames.stateProvince]: { $nin: [ null, undefined, '' ] },
                    [fieldNames.recordedBy]: { $nin: [ null, undefined, '' ] }
                }
            },
            {
                $group: {
                    _id: {
                        stateProvince: `$${fieldNames.stateProvince}`,
                        recordedBy: `$${fieldNames.recordedBy}`
                    },
                    count: { $sum: 1 }
                }
            },
            {
                $group: {
                    _id: '$_id.stateProvince',
                    totalCount: { $sum: '$count' },
                    collectors: {
                        $push: {
                            recordedBy: '$_id.recordedBy',
                            count: '$count'
                        }
                    }
                }
            },
            {
                $addFields: {
                    collectors: {
                        $sortArray: {
                            input: '$collectors',
                            sortBy: { 'count': -1 }
                        }
                    }
                }
            },
            {
                $sort: { '_id': 1 }
            }
        ])
    }

    async getStateCollectorCountyCounts(filter = {}) {
        return await this.repository.aggregate([
            {
                $match: {
                    ...filter,
                    [fieldNames.stateProvince]: { $nin: [ null, undefined, '' ] },
                    [fieldNames.recordedBy]: { $nin: [ null, undefined, '' ] },
                    [fieldNames.county]: { $nin: [ null, undefined, '' ] }
                }
            },
            {
                $group: {
                    _id: {
                        stateProvince: `$${fieldNames.stateProvince}`,
                        recordedBy: `$${fieldNames.recordedBy}`
                    },
                    uniqueCounties: { $addToSet: `$${fieldNames.county}` }
                }
            },
            {
                $group: {
                    _id: '$_id.stateProvince',
                    collectors: {
                        $push: {
                            recordedBy: '$_id.recordedBy',
                            count: { $size: '$uniqueCounties' }
                        }
                    }
                }
            },
            {
                $addFields: {
                    collectors: {
                        $sortArray: {
                            input: '$collectors',
                            sortBy: { 'count': -1 }
                        }
                    }
                }
            },
            {
                $sort: { '_id': 1 }
            }
        ])
    }

    async getStateGenusBeeCounts(filter = {}) {
        return await this.repository.aggregate([
            {
                $match: {
                    ...filter,
                    [fieldNames.stateProvince]: { $nin: [ null, undefined, '' ] },
                    [fieldNames.plantGenus]: { $nin: [ null, undefined, '' ] }
                }
            },
            {
                $group: {
                    _id: {
                        stateProvince: `$${fieldNames.stateProvince}`,
                        plantGenus: `$${fieldNames.plantGenus}`
                    },
                    count: { $sum: 1 }
                }
            },
            {
                $group: {
                    _id: '$_id.stateProvince',
                    totalCount: { $sum: '$count' },
                    genera: {
                        $push: {
                            plantGenus: '$_id.plantGenus',
                            count: '$count'
                        }
                    }
                }
            },
            {
                $addFields: {
                    genera: {
                        $sortArray: {
                            input: '$genera',
                            sortBy: { 'count': -1 }
                        }
                    }
                }
            },
            {
                $sort: { '_id': 1 }
            }
        ])
    }

    async getDistinctCoordinates(filter = {}) {
        return await this.repository.distinctCoordinates(filter)
    }

    async getDistinctUrls(filter = {}) {
        return await this.repository.distinct(fieldNames.iNaturalistUrl, filter)
    }

    async getMaxFieldNumber() {
        return await this.repository.maxFieldNumber()
    }

    async count(filter = {}) {
        return await this.repository.count(filter)
    }

    async updateOccurrenceById(id, updateDocument) {
        return await this.repository.updateById(id, updateDocument)
    }

    /*
    * updateOccurrenceFromObservation()
    * Updates specific values (location, elevation, and taxonomy) in an existing occurrence from its corresponding iNaturalist observation
    */
    async updateOccurrenceFromObservation(occurrence, observation, elevations) {
        if (!occurrence) return

        let updateDocument = { ...occurrence }

        // Overwrite the current elevation at the current coordinates
        const coordinate = `${occurrence[fieldNames.latitude]},${occurrence[fieldNames.longitude]}`
        updateDocument[fieldNames.elevation] = elevations[coordinate] || ''

        // Update the coordinate fields if the accuracy is better (smaller) or as good
        // Treat an empty accuracy as perfect precision
        const prevAccuracy = parseInt(occurrence[fieldNames.accuracy]) || ''
        const newAccuracy = observation?.positional_accuracy ?? ''
        if (newAccuracy === '' || newAccuracy < prevAccuracy) {
            const prevLatitude = occurrence[fieldNames.latitude]
            const prevLongitude = occurrence[fieldNames.longitude]
            const newLatitude = observation?.geojson?.coordinates?.at(1)?.toFixed(4)?.toString() || ''
            const newLongitude = observation?.geojson?.coordinates?.at(0)?.toFixed(4)?.toString() || ''
            const newCoordinate = `${newLatitude},${newLongitude}`

            // Check that either coordinate changed before updating the occurrence fields
            if (newLatitude !== prevLatitude || newLongitude !== prevLongitude) {
                updateDocument[fieldNames.elevation] = elevations[newCoordinate] || await ElevationService.getElevation(newLatitude, newLongitude) || ''
                updateDocument[fieldNames.latitude] = newLatitude
                updateDocument[fieldNames.longitude] = newLongitude
                updateDocument[fieldNames.accuracy] = newAccuracy.toString() || ''
            }
        }

        if (observation) {
            updateDocument[fieldNames.resourceRelationship] = 'visits flowers of'
            updateDocument[fieldNames.relatedResourceId] = observation.uuid

            // Look up and update the plant taxonomy
            const plantTaxonomy = TaxaService.getPlantAncestry(observation.taxon)
            updateDocument[fieldNames.plantPhylum] = plantTaxonomy.phylum
            updateDocument[fieldNames.plantOrder] = plantTaxonomy.order
            updateDocument[fieldNames.plantFamily] = plantTaxonomy.family
            updateDocument[fieldNames.plantGenus] = plantTaxonomy.genus
            updateDocument[fieldNames.plantSpecies] = plantTaxonomy.species

            // As a fallback, search the plant taxonomy upward for the first truthy rank
            const minRank = ['species', 'genus', 'family', 'order', 'phylum'].find((rank) => !!plantTaxonomy[rank])
            updateDocument[fieldNames.plantTaxonRank] = observation.taxon?.rank || minRank || ''
        }

        // Rewrite the error flags based on the new data
        updateDocument = this.updateErrorFlags(updateDocument)

        return await this.repository.updateById(updateDocument._id, updateDocument)
    }

    /*
     * writeOccurrencesFromDatabase()
     * Writes all occurrences matching a given filter to a CSV file at the given file path
     */
    async writeOccurrencesFromDatabase(filePath, filter = {}) {
        if (!filePath) return

        await FileManager.writeCSVFromDatabase(
            filePath,
            Object.keys(template),
            async (page) => this.getOccurrencesPage({ page, filter })
        )
    }

    writeOccurrencesFile(filePath, occurrences) {
        if (!filePath) return

        FileManager.writeCSV(filePath, occurrences, Object.keys(template))
    }

    async deleteOccurrences(filter = {}) {
        return await this.repository.deleteMany(filter)
    }
}

export default new OccurrenceService()