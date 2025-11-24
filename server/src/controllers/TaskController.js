import { TaskService } from '../../shared/lib/services/index.js'
import { InvalidArgumentError, ValidationError } from '../../shared/lib/utils/errors.js'

export default class TaskController {
    /*
     * createTask()
     * Creates a task with a given subtask pipeline
     * Inputs:
     * - req.file: a CSV occurrence dataset (creates a blank file if not provided)
     * - req.body.subtasks: a JSON stringified object in the following format:
     * [ { type: 'occurrences' }, { type: 'observations', sources: [ ... ], minDate: '...', maxDate: '...' }, { type: 'labels' }, ... ]
     */
    static async createTask(req, res, next) {
        // Check that required fields exist
        if (!req.body || !req.body.subtasks) {
            res.status(400).send({
                error: 'Missing required request field'
            })
            return
        }

        try {
            // Create task and send its ID to the RabbitMQ queue
            const { insertedId, createdAt } = await TaskService.createTask(req.body.subtasks, req.file?.filename)

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

    /*
     * getTasks()
     * Returns a list of all current and previous tasks stored on the Mongo server
     */
    static async getTasks(req, res, next) {
        try {
            const tasks = await TaskService.getTasks()
            res.status(200).send({
                tasks
            })
        } catch (error) {
            // Forward to 500-code middleware
            next(error)
        }
    }

    /*
     * getTaskById
     * Returns a current or previous task on the Mongo server, referenced by ID
     */
    static async getTaskById(req, res, next) {
        try {
            const task = await TaskService.getTaskById(req.params.id)
            if (task) {
                res.status(200).send({
                    task
                })
            } else {
                next()
            }
        } catch (error) {
            // Forward to 500-code middleware
            next(error)
        }
    }
}