import path from 'path'

import { TaskService } from '../../shared/lib/services/index.js'
import { InvalidArgumentError, ValidationError } from '../../shared/lib/utils/errors.js'

export default class PlantListController {
    static async getPlantList(req, res, next) {
        // Send plantList.csv
        res.status(200).sendFile(path.resolve('./shared/data/plantList.csv'))
    }

    static async uploadPlantList(req, res, next) {
        // Check that required field exists
        if (!req.file) {
            res.status(400).send({
                error: 'Missing required request field'
            })
            return
        }

        res.status(200).send()
    }

    static async updatePlantList(req, res, next) {
        // Check that required field exists
        if (!req.body?.url) {
            res.status(400).send({
                error: 'Missing required request field'
            })
            return
        }

        try {
            // Create task and send its ID to the RabbitMQ queue
            const subtasks = [
                {
                    type: 'plantList',
                    url: req.body.url
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
}