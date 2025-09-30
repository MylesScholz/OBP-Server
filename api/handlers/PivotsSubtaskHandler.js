import BaseSubtaskHandler from './BaseSubtaskHandler.js'
import { fieldNames, fileLimits } from '../utils/constants.js'
import { OccurrenceService, TaskService } from '../services/index.js'
import FileManager from '../utils/FileManager.js'

export default class PivotsSubtaskHandler extends BaseSubtaskHandler {
    constructor() {
        super()
    }

    /* Private Helper Methods */

    #writeStateCollectorBeeCountsFile(filePath, stateCollectorBeeCounts) {
        const fields = [
            'stateProvince',
            'totalCount',
            'recordedBy',
            'count'
        ]

        let rows = []
        for (const stateCounts of stateCollectorBeeCounts) {
            rows.push({
                'stateProvince': stateCounts._id,
                'totalCount': stateCounts.totalCount
            })

            rows = rows.concat(stateCounts.collectors)
        }

        FileManager.writeCSV(filePath, rows, fields)
    }

    #writeStateCollectorCountyCountsFile(filePath, stateCollectorCountyCounts) {
        const fields = [
            'stateProvince',
            'recordedBy',
            'count'
        ]

        let rows = []
        for (const stateCounts of stateCollectorCountyCounts) {
            rows.push({
                'stateProvince': stateCounts._id,
                'totalCount': stateCounts.totalCount
            })

            rows = rows.concat(stateCounts.collectors)
        }

        FileManager.writeCSV(filePath, rows, fields)
    }

    #writeStateGenusBeeCountsFile(filePath, stateGenusBeeCounts) {
        const fields = [
            'stateProvince',
            'totalCount',
            'plantGenus',
            'count'
        ]

        let rows = []
        for (const stateCounts of stateGenusBeeCounts) {
            rows.push({
                'stateProvince': stateCounts._id,
                'totalCount': stateCounts.totalCount
            })

            rows = rows.concat(stateCounts.genera)
        }

        FileManager.writeCSV(filePath, rows, fields)
    }

    /* Main Handler Method */

    async handleTask(taskId) {
        if (!taskId) { return }
        
        // Update the current subtask
        await TaskService.updateCurrentSubtaskById(taskId, 'pivots')

        // Fetch the task, subtask, and previous outputs
        const task = await TaskService.getTaskById(taskId)
        const subtask = task.subtasks.find((subtask) => subtask.type === 'pivots')
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
        const stateCollectorBeeCountsFileName = `pivots_stateCollectorBeeCounts_${task.tag}.csv`
        const stateCollectorBeeCountsFilePath = './api/data/pivots/' + stateCollectorBeeCountsFileName
        const stateCollectorCountyCountsFileName = `pivots_stateCollectorCountyCounts_${task.tag}.csv`
        const stateCollectorCountyCountsFilePath = './api/data/pivots/' + stateCollectorCountyCountsFileName
        const stateGenusBeeCountsFileName = `pivots_stateGenusBeeCounts_${task.tag}.csv`
        const stateGenusBeeCountsFilePath = './api/data/pivots/' + stateGenusBeeCountsFileName

        await TaskService.logTaskStep(taskId, 'Formatting and uploading provided dataset')
        
        // Delete old occurrences (from previous tasks)
        await OccurrenceService.deleteOccurrences()

        // Read data from the input occurrence file and insert it into the occurrences database table
        await OccurrenceService.createOccurrencesFromFile(inputFilePath)

        await TaskService.logTaskStep(taskId, 'Generating pivot tables')

        // A filter for unprinted occurrences
        const unprintedFilter = { [fieldNames.dateLabelPrint]: { $in: [ null, '' ] } }

        // For each state, find the count of unprinted occurrences for each collector
        const stateCollectorBeeCounts = await OccurrenceService.getStateCollectorBeeCounts(unprintedFilter)
        // For each state, find the count of unique counties in the unprinted occurrences of each collector
        const stateCollectorCountyCounts = await OccurrenceService.getStateCollectorCountyCounts(unprintedFilter)
        // For each state, find the count of unprinted occurrence for each plant genus
        const stateGenusBeeCounts = await OccurrenceService.getStateGenusBeeCounts(unprintedFilter)

        // Write output files
        this.#writeStateCollectorBeeCountsFile(stateCollectorBeeCountsFilePath, stateCollectorBeeCounts)
        this.#writeStateCollectorCountyCountsFile(stateCollectorCountyCountsFilePath, stateCollectorCountyCounts)
        this.#writeStateGenusBeeCountsFile(stateGenusBeeCountsFilePath, stateGenusBeeCounts)

        // Update the task result with the output files
        const outputs = [
            { uri: `/api/pivots/${stateCollectorBeeCountsFileName}`, fileName: stateCollectorBeeCountsFileName, type: 'pivots', subtype: 'stateCollectorBeeCounts' },
            { uri: `/api/pivots/${stateCollectorCountyCountsFileName}`, fileName: stateCollectorCountyCountsFileName, type: 'pivots', subtype: 'stateCollectorCountyCounts' },
            { uri: `/api/pivots/${stateGenusBeeCountsFileName}`, fileName: stateGenusBeeCountsFileName, type: 'pivots', subtype: 'stateGenusBeeCounts' }
        ]
        previousSubtaskOutputs.push({ type: subtask.type, outputs })
        await TaskService.updateResultById(taskId, {
            subtaskOutputs: previousSubtaskOutputs
        })

        // Archive excess output files
        FileManager.limitFilesInDirectory('./api/data/pivots', fileLimits.maxPivots)
    }
}