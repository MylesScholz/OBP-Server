import path from 'path'

import { OccurrenceService, TaskService } from '../../shared/lib/services/index.js'
import { InvalidArgumentError, ValidationError } from '../../shared/lib/utils/errors.js'
import FileManager from '../../shared/lib/utils/FileManager.js'
import { fieldNames } from '../../shared/lib/utils/constants.js'

function parseQueryParameters(req) {
    const params = {
        page: 1,
        pageSize: 50,
        filter: {},
        projection: {
            composite_sort: 0,
            date: 0
        }
    }

    // TODO: check authentication and limit return fields

    // Parse query parameters
    const parsedPage = parseInt(req.query.page)
    if (req.query.page && !isNaN(parsedPage)) {
        params.page = parsedPage
    }

    const parsedPerPage = parseInt(req.query.per_page)
    if (req.query.per_page && !isNaN(parsedPerPage)) {
        params.pageSize = parsedPerPage
    }

    const startDate = new Date(req.query.start_date ?? '')
    const endDate = new Date(req.query.end_date ?? '')
    if (startDate > endDate) {
        params.error = {
            status: 400,
            message: 'start_date must be before end_date'
        }
        return params
    }
    if (startDate.toString() !== 'Invalid Date') {
        if (!params.filter.date) params.filter.date = {}
        params.filter.date.$gte = startDate
    }        
    if (endDate.toString() !== 'Invalid Date') {
        if (!params.filter.date) params.filter.date = {}
        params.filter.date.$lte = endDate
    }

    const queryFields = Object.keys(fieldNames).filter((fieldName) => !!req.query[fieldName] || req.query[fieldName] === '')
    for (const queryField of queryFields) {
        params.filter[queryField] = req.query[queryField]
    }

    // TODO: sorting query parameters

    return params
}

export default class OccurrencesController {
    static async getOccurrencesPage(req, res, next) {
        // Parse query parameters
        const params = parseQueryParameters(req)

        if (params.error) {
            res.status(params.error.status ?? 400).send({
                error: params.error.message ?? 'Error in query parameters'
            })
        }

        try {
            const occurrencesPage = await OccurrenceService.getOccurrencesPage(params)

            res.status(200).send(occurrencesPage)
        } catch (error) {
            // Forward to 500-code middleware
            next(error)
        }
    }

    static async uploadOccurrences(req, res, next) {
        if (!req.file && !req.body?.occurrences) {
            res.status(400).send({
                error: 'Must provide an occurrences file or an occurrences field'
            })
            return
        }

        // TODO: check authentication and limit modifiable fields

        const results = {
            modifiedCount: 0,
            upsertedCount: 0
        }
        if (req.file) {
            const fileResults = await OccurrenceService.upsertOccurrencesFromFile(req.file)

            results.modifiedCount += fileResults.modifiedCount
            results.upsertedCount += fileResults.upsertedCount
        }
        if (req.body?.occurrences) {
            const jsonResults = await OccurrenceService.upsertOccurrences(req.body.occurrences)

            results.modifiedCount += jsonResults.modifiedCount
            results.upsertedCount += jsonResults.upsertedCount
        }
        
        res.status(200).send(results)
    }

    static async getOccurrencesDownload(req, res, next) {
        // Parse query parameters
        const params = parseQueryParameters(req)

        if (params.error) {
            res.status(params.error.status ?? 400).send({
                error: params.error.message ?? 'Error in query parameters'
            })
        }

        try {
            // Create task and send its ID to the RabbitMQ queue
            const subtasks = [
                {
                    type: 'download',
                    params
                }
            ]
            const { insertedId, createdAt } = await TaskService.createTask(JSON.stringify(subtasks))

            // Return 'Accepted' response and HATEOAS link
            res.status(202).send({
                uri: `/api/tasks/${insertedId}`,
                createdAt
            })
        } catch (error) {
            if (error instanceof InvalidArgumentError || error instanceof ValidationError) {
                res.status(400).send({
                    error: error.message
                })
            } else {
                // Forward to 500-code middleware
                next(error)
            }
        }
    }

    static async getWorkingFile(req, res, next) {
        // Send workingOccurrences.csv
        res.status(200).sendFile(path.resolve('./shared/data/workingOccurrences.csv'))
    }

    static async getBackupFile(req, res, next) {
        // Send backupOccurrences.csv
        res.status(200).sendFile(path.resolve('./shared/data/backupOccurrences.csv'))
    }

    static async syncOccurrenceFiles(req, res, next) {
        const result = FileManager.copyFile(path.resolve('./shared/data/workingOccurrences.csv'), path.resolve('./shared/data/backupOccurrences.csv'))

        if (result.success) {
            res.status(200).send({ success: true })
        } else {
            // Forward to 500-code middleware
            next(result.error)
        }
    }
}