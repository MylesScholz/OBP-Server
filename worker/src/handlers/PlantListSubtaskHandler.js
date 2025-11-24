import BaseSubtaskHandler from './BaseSubtaskHandler.js'
import { ApiService, ObservationService, PlantService, TaskService, TaxaService } from '../../shared/lib/services/index.js'

export default class PlantListSubtaskHandler extends BaseSubtaskHandler {
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
        await TaskService.updateCurrentSubtaskById(taskId, 'plantList')

        // Fetch the task and subtask
        const task = await TaskService.getTaskById(taskId)
        const subtask = task.subtasks.find((subtask) => subtask.type === 'plantList')
        const previousSubtaskOutputs = task.result?.subtaskOutputs ?? []

        // Input and output file names
        const uploadFilePath = task.upload?.filePath ?? ''  // TODO: use file upload?
        const plantListFileName = 'plantList.csv'
        const plantListFilePath = './shared/data/' + plantListFileName

        // Pull and insert iNaturalist observations
        await TaskService.logTaskStep(taskId, 'Querying observations from iNaturalist')

        // Delete old observations (from previous tasks)
        await ObservationService.deleteObservations()
        // Fetch observations from the given URL and insert them into the database
        const observations = await ApiService.fetchUrlPages(subtask.url, this.#createUpdateProgressFn(taskId))
        await ObservationService.createObservations(observations)

        await TaskService.logTaskStep(taskId, 'Updating taxonomy data')
        
        await TaxaService.updateTaxaFromObservations(observations, this.#createUpdateProgressFn(taskId))

        await TaskService.logTaskStep(taskId, 'Combining records from observations and plant list')

        // Delete old plants (from previous tasks)
        await PlantService.deletePlants()
        // Read plantList.csv and insert plants into the database
        await PlantService.createPlantsFromFile()

        // Convert observations into plants and insert them into the database (discarding duplicates)
        await PlantService.createPlantsFromObservations(observations)

        await TaskService.logTaskStep(taskId, 'Writing output files')

        // Write the plants collection to plantList.csv
        await PlantService.writePlantsFromDatabase()

        // Update the task result with the output files
        const outputs = [
            { uri: `/api/plantList`, fileName: plantListFileName, type: 'plantList' }
        ]
        previousSubtaskOutputs.push({ type: subtask.type, outputs })
        await TaskService.updateResultById(taskId, {
            subtaskOutputs: previousSubtaskOutputs
        })
    }
}