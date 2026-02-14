import path from 'path'

import BaseSubtaskHandler from './BaseSubtaskHandler.js'
import { determinations, fieldNames } from '../../shared/lib/utils/constants.js'
import { DeterminationsService, OccurrenceService, TaskService } from '../../shared/lib/services/index.js'

export default class DeterminationsSubtaskHandler extends BaseSubtaskHandler {
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
     * #updateOccurrencesFromDeterminations()
     * Update existing occurrences with matching determinations data
     */
    async #updateOccurrencesFromDeterminations(updateProgress = null) {
        if (updateProgress) await updateProgress(0)

        // Query fieldNumbers (_id) of determinations
        let determinationsFieldNumbers = await DeterminationsService.getDeterminations({ _id: { $ne: '' } }, { projection: { _id: 1 } })
        determinationsFieldNumbers = determinationsFieldNumbers.map((determination) => determination._id)

        // Query occurrences page-by-page to avoid memory constraints
        let pageNumber = 1
        let occurrenceIndex = 0
        const pageSize = 5000
        const occurrencesFilter = {
            [fieldNames.fieldNumber]: { $in: determinationsFieldNumbers }
        }
        const occurrencesProjection = {
            _id: 1,
            [fieldNames.fieldNumber]: 1
        }
        const fieldNameAliases = Object.keys(determinations.fieldNames)
        fieldNameAliases.forEach((alias) => occurrencesProjection[fieldNames[alias]] = 1)

        let occurrencesResults = await OccurrenceService.getOccurrencesPage({ page: pageNumber, pageSize, filter: occurrencesFilter, projection: occurrencesProjection })
        while (pageNumber <= occurrencesResults.pagination.totalPages) {
            for (const occurrence of occurrencesResults.data) {
                // Query for a matching determination
                const determination = await DeterminationsService.getDeterminationById(occurrence[fieldNames.fieldNumber])

                if (determination) {
                    // If any field is different between the matching determination and occurrence, update the occurrence
                    if (fieldNameAliases.some((alias) => occurrence[fieldNames[alias]] !== determination[determinations.fieldNames[alias]])) {
                        // Update the occurrence data from the matching determination
                        await OccurrenceService.updateOccurrenceFromDetermination(occurrence, determination)
                    }

                    // Mark the matching determination as matched (for deletion later)
                    await DeterminationsService.updateDeterminationById(determination._id, { matched: true })
                }

                if (updateProgress) await updateProgress(100 * (++occurrenceIndex) / occurrencesResults.pagination.totalDocuments)
            }

            // Delete matched determinations
            await DeterminationsService.deleteDeterminations({ matched: true })

            // Query the next page
            occurrencesResults = await OccurrenceService.getOccurrencesPage({ page: ++pageNumber, pageSize, filter: occurrencesFilter, projection: occurrencesProjection })
        }

        if (updateProgress) await updateProgress(100)
    }

    /* Main Handler Method */

    async handleTask(taskId) {
        if (!taskId) { return }
        
        // Update the current subtask
        await TaskService.updateCurrentSubtaskById(taskId, 'determinations')

        // Fetch the task and subtask
        const task = await TaskService.getTaskById(taskId)
        const subtask = task.subtasks.find((subtask) => subtask.type === 'determinations')

        // Input and output file names

        // Set the input file to the file upload
        const inputFilePath = task.upload?.filePath ?? ''
        const determinationsFileName = 'determinations.csv'

        await TaskService.logTaskStep(taskId, 'Reading base determinations file')

        // Delete previous determinations from database
        await DeterminationsService.deleteDeterminations()
        // Read determinations data from CSV into database
        await DeterminationsService.createDeterminationsFromFile(this.#createUpdateProgressFn(taskId))

        await TaskService.logTaskStep(taskId, 'Combining records from input file with existing determinations')

        // Append determinations data from the upload file onto database determinations
        await DeterminationsService.upsertDeterminationsFromFile(inputFilePath, subtask.format, this.#createUpdateProgressFn(taskId))

        // Update existing occurrences with determinations data (keyed by fieldNumber)
        await TaskService.logTaskStep(taskId, 'Updating occurrence data with bee species determinations')

        await this.#updateOccurrencesFromDeterminations(this.#createUpdateProgressFn(taskId))

        // Write database determinations to determinations.csv
        await TaskService.logTaskStep(taskId, 'Writing output files')

        await DeterminationsService.writeDeterminationsFromDatabase({}, this.#createUpdateProgressFn(taskId))

        // Update the task result with the output files
        const outputs = [
            { uri: `/api/determinations`, fileName: determinationsFileName, type: 'determinations' }
        ]
        await TaskService.updateSubtaskOutputsById(taskId, 'determinations', outputs)
    }
}