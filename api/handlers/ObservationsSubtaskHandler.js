import BaseSubtaskHandler from './BaseSubtaskHandler.js'
import { fieldNames, fileLimits } from '../utils/constants.js'
import { ElevationService, ObservationService, OccurrenceService, PlacesService, TaskService, TaxaService, UsernamesService } from '../services/index.js'
import FileManager from '../utils/FileManager.js'

export default class ObservationsSubtaskHandler extends BaseSubtaskHandler {
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
     * #insertOccurrencesFromObservations()
     * Inserts new occurrences using unmatched observations from the database
     */
    async #insertOccurrencesFromObservations(elevations, updateProgress) {
        await updateProgress(0)

        const observations = await ObservationService.getUnmatchedObservations()
        const occurrences = []

        let observationIndex = 0
        for (const observation of observations) {
            const occurrence = OccurrenceService.createOccurrenceFromObservation(observation, elevations)
            await updateProgress(99 * (++observationIndex) / observations.length)    // Make the total 99% so progress does not show 100% until insertion is complete (below)

            // specimenId is initially set to the number of bees collected
            // Duplicate observations a number of times equal to this value and overwrite specimenId to index the duplications
            const beesCollected = parseInt(occurrence[fieldNames.specimenId])
            if (!isNaN(beesCollected)) {
                for (let i = 1; i < beesCollected + 1; i++) {
                    const duplicateOccurrence = Object.assign({}, occurrence)
                    duplicateOccurrence[fieldNames.specimenId] = i.toString()

                    occurrences.push(duplicateOccurrence)
                }
            }
        }

        // Insert the occurrences into the database
        const results = await OccurrenceService.createOccurrences(occurrences)

        await updateProgress(100)
        return results
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
        await TaskService.updateCurrentSubtaskById(taskId, 'observations')

        // Fetch the task, subtask, and previous outputs
        const task = await TaskService.getTaskById(taskId)
        const subtask = task.subtasks.find((subtask) => subtask.type === 'observations')
        const previousSubtaskOutputs = task.result?.subtaskOutputs ?? []

        // Input and output file names
        
        // Set the default input file to the file upload
        let inputFilePath = task.upload.filePath
        // If not using the upload file, try to find the specified input file in the previous subtask outputs
        if (subtask.input !== 'upload') {
            const subtaskInputSplit = subtask.input?.split('_') ?? []
            const subtaskInputIndex = parseInt(subtaskInputSplit[0])
            const subtaskInputFileType = subtaskInputSplit[1]
            
            // Get the output file list from the given subtask index
            const outputs = previousSubtaskOutputs[subtaskInputIndex]?.outputs
            // Get the output file matching the given input file type
            const outputFile = outputs?.find((output) => output.type === subtaskInputFileType)

            // Build the input file path if the given file was found in the previous subtask outputs
            inputFilePath = outputFile ? `./api/data/${outputFile.type}/${outputFile.fileName}` : inputFilePath
        }
        const occurrencesFileName = `occurrences_merged_${task.tag}.csv`
        const occurrencesFilePath = './api/data/occurrences/' + occurrencesFileName
        const pullsFileName = `pulls_${task.tag}.csv`
        const pullsFilePath = './api/data/pulls/' + pullsFileName
        const flagsFileName = `flags_${task.tag}.csv`
        const flagsFilePath = './api/data/flags/' + flagsFileName

        await TaskService.logTaskStep(taskId, 'Formatting and uploading provided dataset')

        // Delete old occurrences (from previous tasks)
        await OccurrenceService.deleteOccurrences()

        // Read data from the input occurrence file and insert it into the occurrences database table
        await OccurrenceService.createOccurrencesFromFile(inputFilePath)

        // Pull new iNaturalist observations and insert them
        await TaskService.logTaskStep(taskId, 'Querying new observations from iNaturalist')

        await ObservationService.pullObservations(
            subtask.sources,
            subtask.minDate,
            subtask.maxDate,
            this.#createUpdateProgressFn(taskId)
        )
        const observations = await ObservationService.getObservations()

        // Update places.json and taxa.json from observations table
        await TaskService.logTaskStep(taskId, 'Updating place data')

        await PlacesService.updatePlacesFromObservations(observations, this.#createUpdateProgressFn(taskId))

        await TaskService.logTaskStep(taskId, 'Updating taxonomy data')

        await TaxaService.updateTaxaFromObservations(observations, this.#createUpdateProgressFn(taskId))

        // Update usernames data in memory
        UsernamesService.readUsernames()

        // Query all distinct coordinates from the observations database table
        const coordinates = await ObservationService.getDistinctCoordinates()

        // Read all elevation data
        await TaskService.logTaskStep(taskId, `Reading ${coordinates.length} elevations`)

        const elevations = await ElevationService.getElevations(coordinates, this.#createUpdateProgressFn(taskId))

        // Add new occurrence data from pulled observations
        await TaskService.logTaskStep(taskId, 'Adding new occurrence data from iNaturalist observations')

        await this.#insertOccurrencesFromObservations(elevations, this.#createUpdateProgressFn(taskId))

        // Fill fieldNumber for unindexed occurrences without errors
        await TaskService.logTaskStep(taskId, 'Indexing occurrences')

        const currentYear = (new Date()).getUTCFullYear()
        await this.#indexOccurrences(currentYear)

        await TaskService.logTaskStep(taskId, 'Writing output files')

        // Write unflagged occurrences to the occurrences output file
        const occurrencesFilter = {
            $or: [
                { [fieldNames.errorFlags]: { $exists: false } },
                { [fieldNames.errorFlags]: { $in: [ null, '' ] } }
            ]
        }
        await OccurrenceService.writeOccurrencesFromDatabase(occurrencesFilePath, occurrencesFilter)
        
        // Write unprinted, flagged occurrences to the flags output file
        const flagsFilter = {
            [fieldNames.errorFlags]: { $exists: true, $nin: [ null, '' ] },
            $or: [
                { [fieldNames.dateLabelPrint]: { $exists: false } },
                { [fieldNames.dateLabelPrint]: { $in: [null, ''] } }
            ]
        }
        await OccurrenceService.writeOccurrencesFromDatabase(flagsFilePath, flagsFilter)

        // Write new unflagged occurrences to the pulls output file
        const pullsFilter = {
            $or: [
                { [fieldNames.errorFlags]: { $exists: false } },
                { [fieldNames.errorFlags]: { $in: [ null, '' ] } }
            ],
            new: true
        }
        await OccurrenceService.writeOccurrencesFromDatabase(pullsFilePath, pullsFilter)

        // Update the task result with the output files
        const outputs = [
            { uri: `/api/occurrences/${occurrencesFileName}`, fileName: occurrencesFileName, type: 'occurrences', subtype: 'merged' },
            { uri: `/api/pulls/${pullsFileName}`, fileName: pullsFileName, type: 'pulls' },
            { uri: `/api/flags/${flagsFileName}`, fileName: flagsFileName, type: 'flags' }
        ]
        previousSubtaskOutputs.push({ type: subtask.type, outputs })
        await TaskService.updateResultById(taskId, {
            subtaskOutputs: previousSubtaskOutputs
        })

        // Archive excess output files
        FileManager.limitFilesInDirectory('./api/data/occurrences', fileLimits.maxOccurrences)
        FileManager.limitFilesInDirectory('./api/data/pulls', fileLimits.maxPulls)
        FileManager.limitFilesInDirectory('./api/data/flags', fileLimits.maxFlags)
    }
}