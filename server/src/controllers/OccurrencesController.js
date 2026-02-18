import path from 'path'

import { OccurrenceService, TaskService } from '../../shared/lib/services/index.js'
import { InvalidArgumentError, ValidationError } from '../../shared/lib/utils/errors.js'
import { parseQueryParameters } from '../../shared/lib/utils/utilities.js'

export default class OccurrencesController {
    static async getOccurrencesPage(req, res, next) {
        // Parse query parameters
        const params = parseQueryParameters(req.query, req.adminId)

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
        // Parse query parameters for validation only
        const params = parseQueryParameters(req.query, req.adminId)

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
                    query: req.query
                }
            ]
            const { insertedId, createdAt } = await TaskService.createTask(subtasks)

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

    static async readWorkingFile(req, res, next) {
        try {
            // Create task and send its ID to the RabbitMQ queue
            const subtasks = [
                {
                    type: 'syncOccurrences',
                    operation: 'read',
                    file: 'workingOccurrences'
                }
            ]
            const { insertedId, createdAt } = await TaskService.createTask(subtasks)

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

    static async writeWorkingFile(req, res, next) {
        try {
            // Create task and send its ID to the RabbitMQ queue
            const subtasks = [
                {
                    type: 'syncOccurrences',
                    operation: 'write',
                    file: 'workingOccurrences'
                }
            ]
            const { insertedId, createdAt } = await TaskService.createTask(subtasks)

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

    static async getBackupFile(req, res, next) {
        // Send backupOccurrences.csv
        res.status(200).sendFile(path.resolve('./shared/data/backupOccurrences.csv'))
    }

    static async readBackupFile(req, res, next) {
        try {
            // Create task and send its ID to the RabbitMQ queue
            const subtasks = [
                {
                    type: 'syncOccurrences',
                    operation: 'read',
                    file: 'backupOccurrences'
                }
            ]
            const { insertedId, createdAt } = await TaskService.createTask(subtasks)

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

    static async writeBackupFile(req, res, next) {
        try {
            // Create task and send its ID to the RabbitMQ queue
            const subtasks = [
                {
                    type: 'syncOccurrences',
                    operation: 'write',
                    file: 'backupOccurrences'
                }
            ]
            const { insertedId, createdAt } = await TaskService.createTask(subtasks)

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
}