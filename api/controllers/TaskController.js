import { TaskService } from '../services/index.js'
import { InvalidArgumentError, ValidationError } from '../utils/errors.js'

export default class TaskController {
    /*
     * createOccurrencesTask()
     * Creates a task to format and update a given occurrences dataset
     * Inputs:
     * - req.file: a CSV occurrence dataset (creates a blank file if not provided)
     * - req.body.sources: a comma-separated list of iNaturalist project IDs to pull updates from
     * - req.body.minDate (required if sources provided): the minimum date of observations to pull
     * - req.body.maxDate (required if sources provided): the maximum date of observations to pull
     */
    static async createOccurrencesTask(req, res, next) {
        // Check that required fields exist
        if (!req.file || !req.body || (req.body.sources && (!req.body.minDate || !req.body.maxDate))) {
            res.status(400).send({
                error: 'Missing required request field'
            })
            return
        }

        try {
            // URI of the uploaded base dataset--not the file location
            const datasetURI = `/api/uploads/${req.file.filename}`

            // Split sources into an array
            const sources = req.body.sources?.split(',')

            // Create task and send its ID to the RabbitMQ queue
            const { insertedId, createdAt } = await TaskService.createTask('occurrences', datasetURI, sources, req.body.minDate, req.body.maxDate)

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
     * createLabelsTask()
     * Creates a task to create a PDF document of bee labels from a provided occurrence dataset
     * Requires:
     * - req.file: a CSV occurrence dataset from which to make labels
     */
    static async createLabelsTask(req, res, next) {
        // Check that required field exists
        if (!req.file) {
            res.status(400).send({
                error: 'Missing required request field'
            })
            return
        }

        try {
            // URI of the uploaded base dataset--not the file location
            const datasetURI = `/api/uploads/${req.file.filename}`

            // Create task and send its ID to the RabbitMQ queue
            const { insertedId, createdAt } = await TaskService.createTask('labels', datasetURI)

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
     * createAddressesTask()
     * Creates a task to compile a list of user addresses for printable labels
     * Requires:
     * - req.file: a printable CSV occurrence dataset with which to filter the user data
     */
    static async createAddressesTask(req, res, next) {
        // Check that required field exists
        if (!req.file) {
            res.status(400).send({
                error: 'Missing required request field'
            })
            return
        }

        try {
            // URI of the uploaded base dataset--not the file location
            const datasetURI = `/api/uploads/${req.file.filename}`

            // Create task and send its ID to the RabbitMQ queue
            const { insertedId, createdAt } = await TaskService.createTask('addresses', datasetURI)

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
     * createEmailsTask()
     * Creates a task to compile a list of user email addresses for error notifications
     * Requires:
     * - req.file: a printable CSV occurrence dataset with which to filter the user data
     */
    static async createEmailsTask(req, res, next) {
        // Check that required field exists
        if (!req.file) {
            res.status(400).send({
                error: 'Missing required request field'
            })
            return
        }

        try {
            // URI of the uploaded base dataset--not the file location
            const datasetURI = `/api/uploads/${req.file.filename}`

            // Create task and send its ID to the RabbitMQ queue
            const { insertedId, createdAt } = await TaskService.createTask('emails', datasetURI)

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