import path from 'path'

import BaseSubtaskHandler from './BaseSubtaskHandler.js'
import { OccurrenceService, TaskService } from '../../shared/lib/services/index.js'
import FileManager from '../../shared/lib/utils/FileManager.js'

export default class SyncOccurrencesSubtaskHandler extends BaseSubtaskHandler {
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
        await TaskService.updateCurrentSubtaskById(taskId, 'syncOccurrences')

        // Fetch the task and subtask
        const task = await TaskService.getTaskById(taskId)
        const subtask = task.subtasks.find((subtask) => subtask.type === 'syncOccurrences')

        const workingOccurrencesFilePath = path.resolve('./shared/data/workingOccurrences.csv')
        const backupOccurrencesFilePath = path.resolve('./shared/data/backupOccurrences.csv')

        // There are four operations depending on subtask.operation and subtask.file:
        // operation    file                diagram                 description
        // read         workingOccurrences  working -> database     reads from workingOccurrences.csv into the occurrences database
        // write        workingOccurrences  working <- database     writes into workingOccurrences.csv from the occurrences database
        // read         backupOccurrences   backup  -> working      reads from backupOccurrences.csv into workingOccurrences.csv
        // write        backupOccurrences   backup  <- working      writes into backupOccurrences.csv from workingOccurrences.csv
        if (subtask.operation === 'read' && subtask.file === 'workingOccurrences') {
            await TaskService.logTaskStep(taskId, 'Reading from working occurrences into database')

            // Delete previous occurrences from database
            await OccurrenceService.deleteOccurrences()
            // Read workingOccurrences.csv into database
            await OccurrenceService.createOccurrencesFromFile(workingOccurrencesFilePath, {}, this.#createUpdateProgressFn(taskId))
        } else if (subtask.operation === 'write' && subtask.file === 'workingOccurrences') {
            await TaskService.logTaskStep(taskId, 'Writing into working occurrences from database')

            // Write the entire occurrences collection to the workingOccurrences file
            await OccurrenceService.writeOccurrencesFromDatabase(workingOccurrencesFilePath, {}, {}, this.#createUpdateProgressFn(taskId))
        } else if (subtask.operation === 'read' && subtask.file === 'backupOccurrences') {
            await TaskService.logTaskStep(taskId, 'Reading from backup occurrences into working occurrences')

            // Copy backupOccurrences.csv into workingOccurrences.csv
            FileManager.copyFile(backupOccurrencesFilePath, workingOccurrencesFilePath)
        } else if (subtask.operation === 'write' && subtask.file === 'backupOccurrences') {
            await TaskService.logTaskStep(taskId, 'Writing into backup occurrences from working occurrences')

            // Copy workingOccurrences.csv into backupOccurrences.csv
            FileManager.copyFile(workingOccurrencesFilePath, backupOccurrencesFilePath)
        }
    }
}