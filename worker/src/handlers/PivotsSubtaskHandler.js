import BaseSubtaskHandler from './BaseSubtaskHandler.js'
import { fieldNames, fileLimits } from '../../shared/lib/utils/constants.js'
import { OccurrenceService, TaskService } from '../../shared/lib/services/index.js'
import FileManager from '../../shared/lib/utils/FileManager.js'

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
        let inputFilePath = task.upload?.filePath ?? ''
        // If not using the upload file or selection, try to find the specified input file in the previous subtask outputs
        if (subtask.input !== 'upload' && subtask.input !== 'selection') {
            const subtaskInputSplit = subtask.input?.split('_') ?? []
            const subtaskInputIndex = parseInt(subtaskInputSplit[0])
            const subtaskInputFileType = subtaskInputSplit[1]
            
            // Get the output file list from the given subtask index
            const outputs = task.subtasks[subtaskInputIndex]?.outputs
            // Get the output file matching the given input file type
            const outputFile = outputs?.find((output) => output.type === subtaskInputFileType)

            // Build the input file path if the given file was found in the previous subtask outputs
            inputFilePath = outputFile ? `./shared/data/${outputFile.type}/${outputFile.fileName}` : inputFilePath
        }
        const stateCollectorBeeCountsFileName = `pivots_stateCollectorBeeCounts_${task.tag}.csv`
        const stateCollectorBeeCountsFilePath = './shared/data/pivots/' + stateCollectorBeeCountsFileName
        const stateCollectorCountyCountsFileName = `pivots_stateCollectorCountyCounts_${task.tag}.csv`
        const stateCollectorCountyCountsFilePath = './shared/data/pivots/' + stateCollectorCountyCountsFileName
        const stateGenusBeeCountsFileName = `pivots_stateGenusBeeCounts_${task.tag}.csv`
        const stateGenusBeeCountsFilePath = './shared/data/pivots/' + stateGenusBeeCountsFileName

        await TaskService.logTaskStep(taskId, 'Formatting and uploading provided dataset')
        
        // Delete old scratch space occurrences (from previous tasks)
        await OccurrenceService.deleteOccurrences({ scratch: true })

        if (subtask.input !== 'selection') {
            // Upsert data from the input occurrence file into scratch space (existing records will be moved to scratch space)
            await OccurrenceService.upsertOccurrencesFromFile(inputFilePath, { scratch: true })
        } else {    // subtask.input === 'selection'
            // Move occurrences matching the query parameters into scratch space
            await OccurrenceService.updateOccurrences(subtask.params?.filter ?? {}, { scratch: true })
        }

        await TaskService.logTaskStep(taskId, 'Generating pivot tables')

        // A filter for unprinted scratch space occurrences in the last week
        const lastWeek = new Date()
        lastWeek.setDate(lastWeek.getDate() - 7)
        lastWeek.setHours(12, 0, 0, 0)      // Set time to noon UTC to avoid timezone issues
        const recentUnprintedFilter = {
            scratch: true,
            date: {
                $gte: lastWeek
            },
            $or: [
                { [fieldNames.dateLabelPrint]: { $exists: false } },
                { [fieldNames.dateLabelPrint]: { $in: [ null, '' ] } }
            ]
        }

        // For each state, find the count of unprinted occurrences for each collector
        const stateCollectorBeeCounts = await OccurrenceService.getStateCollectorBeeCounts(recentUnprintedFilter)
        // For each state, find the count of unique counties in the unprinted occurrences of each collector
        const stateCollectorCountyCounts = await OccurrenceService.getStateCollectorCountyCounts(recentUnprintedFilter)
        // For each state, find the count of unprinted occurrence for each plant genus
        const stateGenusBeeCounts = await OccurrenceService.getStateGenusBeeCounts(recentUnprintedFilter)

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
        await TaskService.updateSubtaskOutputsById(taskId, 'pivots', outputs)

        // Archive excess output files
        FileManager.limitFilesInDirectory('./shared/data/pivots', fileLimits.maxPivots)

        // Move occurrences with a fieldNumber or no errorFlags back to non-scratch space
        const unscratchFilter = {
            scratch: true,
            $or: [
                { [fieldNames.fieldNumber]: { $exists: true, $nin: [ null, '' ] } },
                { [fieldNames.errorFlags]: { $exists: false } },
                { [fieldNames.errorFlags]: { $in: [ null, '' ] } }
            ]
        }
        await OccurrenceService.updateOccurrences(unscratchFilter, { scratch: false })
        // Discard remaining scratch space occurrences
        await OccurrenceService.deleteOccurrences({ scratch: true })
    }
}