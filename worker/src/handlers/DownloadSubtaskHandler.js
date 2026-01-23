import BaseSubtaskHandler from './BaseSubtaskHandler.js'
import { fileLimits } from '../../shared/lib/utils/constants.js'
import { OccurrenceService, TaskService } from '../../shared/lib/services/index.js'
import FileManager from '../../shared/lib/utils/FileManager.js'

export default class DownloadSubtaskHandler extends BaseSubtaskHandler {
    constructor() {
        super()
    }

    /* Private Helper Methods */

    /* Main Handler Method */

    async handleTask(taskId) {
        if (!taskId) { return }
        
        // Update the current subtask
        await TaskService.updateCurrentSubtaskById(taskId, 'download')

        // Fetch the task and subtask
        const task = await TaskService.getTaskById(taskId)
        const subtask = task.subtasks.find((subtask) => subtask.type === 'download')

        // Input and output file names
        const occurrencesFileName = `occurrences_${task.tag}.csv`
        const occurrencesFilePath = './shared/data/occurrences/' + occurrencesFileName

        const filter = subtask.params.filter ?? {}
        const projection = subtask.params.projection ?? {}
        await OccurrenceService.writeOccurrencesFromDatabase(occurrencesFilePath, filter, projection)

        // Update the task result with the output files
        const outputs = [
            { uri: `/api/occurrences/${occurrencesFileName}`, fileName: occurrencesFileName, type: 'occurrences' },
        ]
        await TaskService.updateSubtaskOutputsById(taskId, 'download', outputs)

        // Archive excess output files
        FileManager.limitFilesInDirectory('./shared/data/occurrences', fileLimits.maxOccurrences)
    }
}