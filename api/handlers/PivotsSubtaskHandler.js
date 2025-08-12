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
        if (previousSubtaskOutputs.length > 0) {
            // Find the last subtask output with an occurrences output file
            const lastSubtaskOutput = previousSubtaskOutputs.findLast((subtaskOutput) => !!subtaskOutput.outputs?.find((output) => output.type === 'occurrences'))
            // Find the occurrences output file
            const occurrencesSubtaskOutputFile = lastSubtaskOutput?.outputs?.find((output) => output.type === 'occurrences')
            // If an occurrences file was found, use it as the input file for this subtask
            inputFilePath = occurrencesSubtaskOutputFile ? `./api/data/occurrences/${occurrencesSubtaskOutputFile?.fileName}` : inputFilePath
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
        const unprintedFilter = { [fieldNames.dateLabelPrint]: { $in: [ null, undefined, '' ] } }

        // For each state, find the count of unprinted occurrences for each collector
        const stateCollectorBeeCounts = await OccurrenceService.getStateCollectorBeeCounts()
        // For each state, find the count of unique counties in the unprinted occurrences of each collector
        const stateCollectorCountyCounts = await OccurrenceService.getStateCollectorCountyCounts()
        // For each state, find the count of unprinted occurrence for each plant genus
        const stateGenusBeeCounts = await OccurrenceService.getStateGenusBeeCounts()

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