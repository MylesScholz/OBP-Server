import BaseSubtaskHandler from './BaseSubtaskHandler.js'
import { OccurrenceService, TaskService } from '../../shared/lib/services/index.js'

export default class UploadSubtaskHandler extends BaseSubtaskHandler {
    constructor() {
        super()
    }

    /* Main Handler Method */

    async handleTask(taskId) {
        if (!taskId) { return }
        
        // Update the current subtask
        await TaskService.updateCurrentSubtaskById(taskId, 'upload')

        // Fetch the task and subtask
        const task = await TaskService.getTaskById(taskId)
        const subtask = task.subtasks.find((subtask) => subtask.type === 'upload')

        // Input file name
        const uploadFilePath = task.upload?.filePath ?? ''

        if (subtask.replace) {
            await TaskService.logTaskStep(taskId, 'Replacing occurrences')

            // Fully overwrite matching occurrences from the upload file; optionally insert new occurrences
            await OccurrenceService.replaceOccurrencesFromFile(uploadFilePath, { upsert: !!subtask.upsert })
        } else if (subtask.upsert) {
            await TaskService.logTaskStep(taskId, 'Upserting occurrences')

            // Update matching occurrences from the upload file and insert new occurrences
            await OccurrenceService.upsertOccurrencesFromFile(uploadFilePath)
        } else {
            await TaskService.logTaskStep(taskId, 'Updating occurrences')

            // Only update matching occurrences from the upload file
            await OccurrenceService.updateMatchingOccurrencesFromFile(uploadFilePath)
        }
    }
}