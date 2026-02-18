import path from 'path'

import { TaskService } from '../../shared/lib/services/index.js'
import { InvalidArgumentError, ValidationError } from '../../shared/lib/utils/errors.js'

export default class DeterminationsController {
    static async getDeterminationsFile(req, res, next) {
        // Send determinations.csv
        res.status(200).sendFile(path.resolve('./shared/data/determinations.csv'))
    }

    static async uploadDeterminationsFile(req, res, next) {
        // Check that required fields exist
        if (!req.file || !req.body.format) {
            res.status(400).send({
                error: 'Missing required request field'
            })
            return
        }
        // Check that req.format is valid
        if (req.body.format !== 'ecdysis' && req.body.format !== 'determinations') {
            res.status(400).send({
                error: 'Unknown file format provided'
            })
            return
        }

        try {
            // Create task and send its ID to the RabbitMQ queue
            const subtasks = [
                {
                    type: 'determinations',
                    format: req.body.format
                }
            ]
            const { insertedId, createdAt } = await TaskService.createTask(subtasks, req.file.filename)

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