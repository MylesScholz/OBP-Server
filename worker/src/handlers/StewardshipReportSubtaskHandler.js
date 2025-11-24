import BaseSubtaskHandler from './BaseSubtaskHandler.js'
import { fileLimits } from '../../shared/lib/utils/constants.js'
import { ApiService, ObservationService, ScriptService, TaskService } from '../../shared/lib/services/index.js'
import FileManager from '../../shared/lib/utils/FileManager.js'
import { delay } from '../../shared/lib/utils/utilities.js'

export default class StewardshipReportSubtaskHandler extends BaseSubtaskHandler {
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
        await TaskService.updateCurrentSubtaskById(taskId, 'stewardshipReport')

        // Fetch the task and subtask
        const task = await TaskService.getTaskById(taskId)
        const subtask = task.subtasks.find((subtask) => subtask.type === 'stewardshipReport')
        const previousSubtaskOutputs = task.result?.subtaskOutputs ?? []

        // Input and output file names
        const uploadFilePath = task.upload?.filePath ?? ''
        const observationsFileName = `observations_${task.tag}.csv`
        const observationsFilePath = './shared/data/observations/' + observationsFileName
        const stewardshipReportFileName = `observations_${task.tag}-report.pdf`
        const stewardshipReportFilePath = './shared/data/reports/' + stewardshipReportFileName

        // Pull iNaturalist observations and write them to a CSV in /shared/data/observations
        await TaskService.logTaskStep(taskId, 'Querying observations from iNaturalist')

        // Delete old observations (from previous tasks)
        await ObservationService.deleteObservations()
        // Fetch observations from the given URL and insert them into the database
        const observations = await ApiService.fetchUrlPages(subtask.url, this.#createUpdateProgressFn(taskId))
        await ObservationService.createObservations(observations)
        // Flatten and write the observations to a CSV in /shared/data/observations
        await ObservationService.writeObservationsFromDatabase(observationsFilePath)

        // Execute the stewardship report R script
        await TaskService.logTaskStep(taskId, 'Creating stewardship report')
        await TaskService.updateProgressPercentageById(taskId, 0)
        
        const { success, stdout, stderr } = await ScriptService.runRScript('./scripts/makeReports.R', [ uploadFilePath ])
        
        // Wait 5 seconds for rendering to finish
        await delay(5000)

        await TaskService.updateProgressPercentageById(taskId, 0)

        // Clean up observations files
        await TaskService.logTaskStep(taskId, 'Cleaning up files')

        FileManager.clearDirectory('./shared/data/observations')

        // Update the task result with the output files
        const outputs = [
            { uri: `/api/reports/${stewardshipReportFileName}`, fileName: stewardshipReportFileName, type: 'report', subtype: 'stewardship' }
        ]
        previousSubtaskOutputs.push({ type: subtask.type, outputs })
        await TaskService.updateResultById(taskId, {
            subtaskOutputs: previousSubtaskOutputs
        })

        // Archive excess output files
        FileManager.limitFilesInDirectory('./shared/data/reports', fileLimits.maxReports)
    }
}