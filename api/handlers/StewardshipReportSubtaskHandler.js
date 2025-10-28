import BaseSubtaskHandler from './BaseSubtaskHandler.js'
import { fileLimits } from '../utils/constants.js'
import { ApiService, ObservationService, ScriptService, TaskService } from '../services/index.js'
import FileManager from '../utils/FileManager.js'

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
        const stewardshipReportFileName = `report_stewardship_${task.tag}.pdf`
        const stewardshipReportFilePath = './api/data/reports/' + stewardshipReportFileName
        const observationsFileName = `observations_${task.tag}.csv`
        const observationsFilePath = './api/data/observations/' + observationsFileName

        // Pull iNaturalist observations and write them to a CSV in /api/data/observations
        await TaskService.logTaskStep(taskId, 'Querying observations from iNaturalist')

        // Delete old observations (from previous tasks)
        await ObservationService.deleteObservations()
        // Fetch observations from the given URL and insert them into the database
        const observations = await ApiService.fetchUrlPages(subtask.url, this.#createUpdateProgressFn(taskId))
        await ObservationService.createObservations(observations)
        // Flatten and write the observations to a CSV in /api/data/observations
        await ObservationService.writeObservationsFromDatabase(observationsFilePath)

        // Execute the stewardship report R script
        await TaskService.logTaskStep(taskId, 'Creating stewardship report')
        
        const { success, stdout, stderr } = await ScriptService.runRScript('./api/scripts/makeReports.R', [ uploadFilePath ])

        // Clean up observations files
        await TaskService.logTaskStep(taskId, 'Cleaning up files')

        FileManager.clearDirectory('./api/data/observations')

        // Update the task result with the output files
        const outputs = [
            { uri: `/api/reports/${stewardshipReportFileName}`, fileName: stewardshipReportFileName, type: 'report', subtype: 'stewardship' }
        ]
        previousSubtaskOutputs.push({ type: subtask.type, outputs })
        await TaskService.updateResultById(taskId, {
            subtaskOutputs: previousSubtaskOutputs
        })

        // Archive excess output files
        FileManager.limitFilesInDirectory('./api/data/reports', fileLimits.maxReports)
    }
}