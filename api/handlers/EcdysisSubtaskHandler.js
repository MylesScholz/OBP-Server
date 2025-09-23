import BaseSubtaskHandler from './BaseSubtaskHandler.js'
import { fieldNames, fileLimits } from '../utils/constants.js'
import { ApiService, ElevationService, ObservationService, OccurrenceService, PlacesService, TaskService, TaxaService } from '../services/index.js'
import FileManager from '../utils/FileManager.js'

export default class EcdysisSubtaskHandler extends BaseSubtaskHandler {
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

    /* Main Handler Method */

    async handleTask(taskId) {
        if (!taskId) { return }
        
        // Update the current subtask
        await TaskService.updateCurrentSubtaskById(taskId, 'ecdysis')

        // Fetch the task and subtask
        const task = await TaskService.getTaskById(taskId)
        const subtask = task.subtasks.find((subtask) => subtask.type === 'ecdysis')
        const previousSubtaskOutputs = task.result?.subtaskOutputs ?? []

        // Input and output file names
        const inputFilePath = task.upload.filePath     // This subtask only accepts the upload file (no other subtask outputs an Ecdysis file)
        const occurrencesFileName = `occurrences_${task.tag}.csv`
        const occurrencesFilePath = './api/data/occurrences/' + occurrencesFileName
        const duplicatesFileName = `duplicates_${task.tag}.csv`
        const duplicatesFilePath = './api/data/duplicates/' + duplicatesFileName
        const flagsFileName = `flags_${task.tag}.csv`
        const flagsFilePath = './api/data/flags/' + flagsFileName

        await TaskService.logTaskStep(taskId, 'Partially reformatting provided dataset into occurrences')

        // Delete old occurrences (from previous tasks)
        await OccurrenceService.deleteOccurrences()

        // Read data from the input Ecdysis file and partially reformat it into occurrences (some necessary data is missing from the Ecdysis format)
        await OccurrenceService.createPartialOccurrencesFromEcdysisFile(inputFilePath)
        console.log('Partial occurrences (post-insert):', await OccurrenceService.count())

        await TaskService.logTaskStep(taskId, 'Querying corresponding iNaturalist observations from provided dataset')

        // Query all distinct URLs from the partial occurrences (should be all occurrence in the table) and extract the observation IDs
        const distinctUrls = await OccurrenceService.getDistinctUrls({ partial: true })
        const observationIds = distinctUrls.map((url) => url.split('/').pop())
                                           .filter((id) => id && !isNaN(id))
        // Fetch the observations corresponding to the partial occurrences and insert them into the observations database table
        let matchingObservations = await ApiService.fetchObservationsByIds(observationIds, this.#createUpdateProgressFn(taskId))
        // Set a custom field indicating that this observation has a matching partial occurrence
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

        // Find all distinct coordinates in the partial occurrences
        const coordinates = await OccurrenceService.getDistinctCoordinates({ partial: true })

        // Read elevation data
        await TaskService.logTaskStep(taskId, `Reading ${coordinates.length} elevations`)

        const elevations = await ElevationService.getElevations(coordinates, this.#createUpdateProgressFn(taskId))

        // Update partial occurrence data from its corresponding observations
        await TaskService.logTaskStep(taskId, 'Updating partial occurrence data from iNaturalist observations')

        const { duplicates, errors } = await OccurrenceService.createOccurrencesFromPartialOccurrences(observations, elevations, this.#createUpdateProgressFn(taskId))
        console.log('Duplicates:', duplicates.length)
        console.log('Errors:', errors.length)

        await TaskService.logTaskStep(taskId, 'Writing output files')
        
        // Write unflagged occurrences to the occurrences output file
        const occurrencesFilter = {
            $or: [
                { [fieldNames.errorFlags]: { $in: [ null, undefined, '' ] } }
            ]
        }
        await OccurrenceService.writeOccurrencesFromDatabase(occurrencesFilePath, occurrencesFilter)

        // Write duplicate occurrences into the duplicates output file
        OccurrenceService.writeOccurrencesFile(duplicatesFilePath, duplicates)

        // Write erroneous occurrences into the flags output file
        OccurrenceService.writeOccurrencesFile(flagsFilePath, errors)

        // Update the task result with the output files
        const outputs = [
            { uri: `/api/occurrences/${occurrencesFileName}`, fileName: occurrencesFileName, type: 'occurrences' },
            { uri: `/api/duplicates/${duplicatesFileName}`, fileName: duplicatesFileName, type: 'duplicates' },
            { uri: `/api/flags/${flagsFileName}`, fileName: flagsFileName, type: 'flags' }
        ]
        previousSubtaskOutputs.push({ type: subtask.type, outputs })
        await TaskService.updateResultById(taskId, {
            subtaskOutputs: previousSubtaskOutputs
        })

        // Archive excess output files
        FileManager.limitFilesInDirectory('./api/data/occurrences', fileLimits.maxOccurrences)
    }
}