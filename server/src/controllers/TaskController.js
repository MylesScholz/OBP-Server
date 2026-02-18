import { parseSubtasks } from '../../shared/lib/utils/utilities.js'
import { subtasks as subtasksConstant } from '../../shared/lib/utils/constants.js'
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
            // Parse a valid subtasks object from the given JSON string (throws InvalidArgumentErrors and ValidationErrors)
            const subtasks = parseSubtasks(req.body.subtasks)

            // List of subtasks that require authentication to use
            const authSubtasks = subtasksConstant.filter((subtask) => subtask.authRequired).map((subtask) => subtask.type)
            // Send 'unauthorized' response if unauthenticated and some subtask requires authentication
            if (!req.adminId && subtasks.some((subtask) => authSubtasks.includes(subtask.type))) {
                res.status(401).send({
                    error: 'Valid authentication token required'
                })
                return
            }

            // Create task and send its ID to the RabbitMQ queue
            const { insertedId, createdAt } = await TaskService.createTask(subtasks, req.file?.filename)

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

            // List of subtasks that require authentication to use
            const authSubtasks = subtasksConstant.filter((subtask) => subtask.authRequired).map((subtask) => subtask.type)
            // If unauthenticated, filter out tasks with subtasks that require authentication
            // Filter subtask fields to exclude 'params' (for internal use only)
            const filteredTasks = tasks
                .filter((task) => req.adminId || !task.subtasks.some((subtask) => authSubtasks.includes(subtask.type)))
                .map((task) => ({ ...task, subtasks: task.subtasks.map(({ params: _, ...subtask }) => subtask) }))

            res.status(200).send({
                tasks: filteredTasks
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
                // List of subtasks that require authentication to use
                const authSubtasks = subtasksConstant.filter((subtask) => subtask.authRequired).map((subtask) => subtask.type)

                // Send 'unauthorized' response if unauthenticated and some subtask requires authentication
                // Otherwise, send selected task
                if (!req.adminId && task.subtasks.some((subtask) => authSubtasks.includes(subtask.type))) {
                    res.status(401).send({
                        error: 'Valid authentication token required'
                    })
                } else {
                    res.status(200).send({
                        task
                    })
                }
            } else {
                next()
            }
        } catch (error) {
            // Forward to 500-code middleware
            next(error)
        }
    }
}