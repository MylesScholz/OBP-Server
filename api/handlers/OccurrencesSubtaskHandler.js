import BaseSubtaskHandler from './BaseSubtaskHandler.js'
import { fieldNames, fileLimits, ofvs } from '../utils/constants.js'
import { getOFV } from '../utils/utilities.js'
import { ApiService, ElevationService, ObservationService, ObservationViewService, OccurrenceService, OccurrenceViewService, PlacesService, TaskService, TaxaService } from '../services/index.js'
import FileManager from '../utils/FileManager.js'

export default class OccurrencesSubtaskHandler extends BaseSubtaskHandler {
    constructor() {
        super()
    }

    /* Private Helper Methods */

    /*
     * #createUpdateProgressFn()
     * Returns a function that updates a given task's current step progress percentage
     */
    #createUpdateProgressFn(taskId) {
        return async (percentage) => {
            return await TaskService.updateProgressPercentageById(taskId, percentage)
        }
    }

    /*
     * #updateOccurrencesFromObservations()
     * Updates existing occurrences using matching observations from the database
     */
    async #updateOccurrencesFromObservations(elevations, updateProgress) {
        await updateProgress(0)

        // Query the joined occurrences-observations table page-by-page to avoid memory constraints
        let pageNumber = 1
        let occurrenceIndex = 0
        const options = {
            projection: {
                uuid: 1,
                positional_accuracy: 1,
                geojson: 1,
                taxon: 1
            }
        }
        let results = await OccurrenceViewService.getOccurrenceViewPage(pageNumber, options)
        while (pageNumber < results.pagination.totalPages + 1) {
            for (const occurrence of results.data) {
                // Update the occurrence data from the matching observation
                await OccurrenceService.updateOccurrenceFromObservation(occurrence, occurrence.observation, elevations)

                await updateProgress(100 * (++occurrenceIndex) / results.pagination.totalDocuments)
            }

            // Query the next page
            results = await OccurrenceViewService.getOccurrenceViewPage(++pageNumber, options)
        }

        await updateProgress(100)
    }

    /*
     * #insertOccurrencesFromBeeIncreases()
     * Adjusts the number of occurrences corresponding to each observation to match the number of bees collected (if increased)
     */
    async #insertOccurrencesFromBeeIncreases(updateProgress) {
        await updateProgress(0)

        // Query observations with matching occurrences, keeping only one occurrence and the count of matching occurrences
        const observations = await ObservationViewService.getObservationsWithOccurrences()
        const occurrences = []

        let i = 0
        for (const observation of observations) {
            const beesCollected = getOFV(observation.ofvs, ofvs.beesCollected)

            if (beesCollected > observation.occurrenceCount) {
                // Create new occurrences to make up the difference between the existing occurrences and the new number of bees collected
                for (let j = 1; j < beesCollected - observation.occurrenceCount + 1; j++) {
                    // Duplicate the first occurrence and set its SPECIMEN_ID
                    const duplicateOccurrence = Object.assign({}, observation.firstOccurrence)

                    duplicateOccurrence[fieldNames.specimenId] = (observation.occurrenceCount + j).toString()
                    // Clear OBSERVATION_NO and DATE_LABEL_PRINT fields so they can be assigned properly later
                    duplicateOccurrence[fieldNames.fieldNumber] = ''
                    duplicateOccurrence[fieldNames.dateLabelPrint] = ''
                    // Tag the occurrence as new
                    duplicateOccurrence.new = true

                    occurrences.push(duplicateOccurrence)
                }
            }

            await updateProgress(100 * (++i) / observations.length)
        }

        return await OccurrenceService.createOccurrences(occurrences)
    }

    /*
     * #incrementFieldNumber()
     * Takes a given field number as a string and returns the next in the sequence, maintaining the year prefix
     */
    #incrementFieldNumber(fieldNumber) {
        // Catch invalid numbers
        if (!fieldNumber || isNaN(fieldNumber)) return ''

        // Convert the number to a string if it is not one
        if (typeof fieldNumber !== 'string') {
            fieldNumber = fieldNumber.toString()
        }

        // Split the given number at the second character
        const prefix = fieldNumber.slice(0, 2)
        const suffix = fieldNumber.slice(2)

        // Convert the suffix to an integer, increment it, and parse it back to a string of fixed length
        let nextSuffix = parseInt(suffix)
        nextSuffix = (++nextSuffix).toString().padStart(suffix.length, '0')

        // Return the concatenated prefix and new suffix
        return prefix + nextSuffix
    }

    /*
     * #indexOccurrences()
     * Fills the fieldNumber, occurrenceId, and resourceId fields for unflagged occurrences in the database
     */
    async #indexOccurrences(year) {
        // Query the highest field number from the occurrence database
        const maxFieldNumber = await OccurrenceService.getMaxFieldNumber()

        // Create a default field number from the given year
        const yearPrefix = year.toString().slice(2)
        let nextFieldNumber = yearPrefix + '000001'

        nextFieldNumber = maxFieldNumber ? this.#incrementFieldNumber(maxFieldNumber) : nextFieldNumber

        // Query occurrences page-by-page to avoid memory constraints
        const updates = []
        let pageNumber = 1
        let results = await OccurrenceService.getUnindexedOccurrencesPage({ page: pageNumber })
        while (pageNumber < results.pagination.totalPages + 1) {
            for (const occurrence of results.data) {
                // Set field number, and if stateProvince is 'OR', set occurrenceId and resourceId
                const updateDocument = { ...occurrence, observation: null }

                updateDocument[fieldNames.fieldNumber] = nextFieldNumber
                if (occurrence[fieldNames.stateProvince] === 'OR') {
                    updateDocument[fieldNames.occurrenceId] = occurrence[fieldNames.occurrenceId] || `https://osac.oregonstate.edu/OBS/OBA_${nextFieldNumber}`
                    updateDocument[fieldNames.resourceId] = occurrence[fieldNames.resourceId] || `https://osac.oregonstate.edu/OBS/OBA_${nextFieldNumber}`
                }

                const id = OccurrenceService.generateOccurrenceId(occurrence)
                updates.push({ id, updateDocument })
                nextFieldNumber = this.#incrementFieldNumber(nextFieldNumber)
            }

            // Query the next page
            results = await OccurrenceService.getUnindexedOccurrencesPage({ page: ++pageNumber })
        }

        for (const update of updates) {
            const { id, updateDocument } = update
            await OccurrenceService.updateOccurrenceById(id, updateDocument)
        }
    }

    /* Main Handler Method */

    async handleTask(taskId) {
        if (!taskId) { return }

        // Update the current subtask
        await TaskService.updateCurrentSubtaskById(taskId, 'occurrences')

        // Fetch the task and subtask
        const task = await TaskService.getTaskById(taskId)
        const subtask = task.subtasks.find((subtask) => subtask.type === 'occurrences')

        // Input and output file names
        const uploadFilePath = task.upload.filePath
        const occurrencesFileName = `occurrences_${task.tag}.csv`
        const occurrencesFilePath = './api/data/occurrences/' + occurrencesFileName
        const duplicatesFileName = `duplicates_${task.tag}.csv`
        const duplicatesFilePath = './api/data/duplicates/' + duplicatesFileName

        await TaskService.logTaskStep(taskId, 'Formatting and uploading provided dataset')

        // Delete old occurrences (from previous tasks)
        await OccurrenceService.deleteOccurrences()

        // Read data from the input occurrence file and insert it into the occurrences database table
        const { duplicates: duplicateOccurrences } = await OccurrenceService.createOccurrencesFromFile(uploadFilePath)

        await TaskService.logTaskStep(taskId, 'Querying corresponding iNaturalist observations from provided dataset')

        // Query all distinct URLs from the occurrences database table and extract the observation IDs
        const distinctUrls = await OccurrenceService.getDistinctUrls()
        const observationIds = distinctUrls.map((url) => url.split('/').pop())
                                        .filter((id) => id && !isNaN(id))
        // Fetch the observations corresponding to the uploaded occurrences and insert them into the observations database table
        let matchingObservations = await ApiService.fetchObservationsByIds(observationIds, this.#createUpdateProgressFn(taskId))
        // Set a custom field indicating that this observation has a matching occurrence
        matchingObservations = matchingObservations.map((obs) => ({ ...obs, matched: true }))

        // Insert observations into the database; delete old observations first
        await ObservationService.deleteObservations()
        if (matchingObservations.length > 0) {
            await ObservationService.createObservations(matchingObservations)
        }

        const observations = await ObservationService.getObservations()

        // Update places.json and taxa.json from observations table
        await TaskService.logTaskStep(taskId, 'Updating place data')

        await PlacesService.updatePlacesFromObservations(observations, this.#createUpdateProgressFn(taskId))

        await TaskService.logTaskStep(taskId, 'Updating taxonomy data')

        await TaxaService.updateTaxaFromObservations(observations, this.#createUpdateProgressFn(taskId))

        // Query all distinct coordinates from the occurrences database table
        let coordinates = await OccurrenceService.getDistinctCoordinates()
        // Query all distinct coordinates from the observations database table and append them (deduplicating with a Set)
        coordinates = [...(new Set(coordinates.concat(await ObservationService.getDistinctCoordinates())))]

        // Read all elevation data
        await TaskService.logTaskStep(taskId, `Reading ${coordinates.length} elevations`)

        const elevations = await ElevationService.getElevations(coordinates, this.#createUpdateProgressFn(taskId))

        // Update existing occurrence data from its corresponding observations
        await TaskService.logTaskStep(taskId, 'Updating occurrence data from iNaturalist observations')

        await this.#updateOccurrencesFromObservations(elevations, this.#createUpdateProgressFn(taskId))

        // Add new occurrence data from bee increases
        await TaskService.logTaskStep(taskId, 'Adding new occurrence data from bee increases')

        await this.#insertOccurrencesFromBeeIncreases(this.#createUpdateProgressFn(taskId))

        // Fill fieldNumber for unindexed occurrences without errors
        await TaskService.logTaskStep(taskId, 'Indexing occurrences')

        const currentYear = (new Date()).getUTCFullYear()
        await this.#indexOccurrences(currentYear)

        await TaskService.logTaskStep(taskId, 'Writing output files')

        // Write old and unflagged occurrences to the occurrences output file
        const occurrencesFilter = {
            $or: [
                { new: { $exists: false } },
                { [fieldNames.errorFlags]: { $in: [ null, undefined, '' ] } }
            ]
        }
        await OccurrenceService.writeOccurrencesFromDatabase(occurrencesFilePath, occurrencesFilter)

        // Write duplicate occurrences from the input file into the duplicates output file
        OccurrenceService.writeOccurrencesFile(duplicatesFilePath, duplicateOccurrences)

        // Update the task result with the output files
        // Overwrite previous outputs so that occurrences subtasks are always at the start of the subtask pipelne
        const outputs = [
            { uri: `/api/occurrences/${occurrencesFileName}`, fileName: occurrencesFileName, type: 'occurrences' },
            { uri: `/api/duplicates/${duplicatesFileName}`, fileName: duplicatesFileName, type: 'duplicates' }
        ]
        await TaskService.updateResultById(taskId, {
            subtaskOutputs: [ { type: subtask.type, outputs } ]
        })

        // Archive excess output files
        FileManager.limitFilesInDirectory('./api/data/occurrences', fileLimits.maxOccurrences)
        FileManager.limitFilesInDirectory('./api/data/duplicates', fileLimits.maxDuplicates)
    }
}