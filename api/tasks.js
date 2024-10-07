import Router from 'express'

import upload from './lib/multer.js'
import { getObservationsChannel, observationsQueueName, getLabelsChannel, labelsQueueName } from './lib/rabbitmq.js'
import { createTask, getTaskById, getTasks } from './models/task.js'

const tasksRouter = Router()

/*
 * POST /api/tasks/observations
 * Creates a task to fetch data updates from iNaturalist.org and merge them into a provided dataset
 * Requires:
 * - req.file: a CSV base observation dataset
 * - req.body.sources: a comma-separated list of iNaturalist project IDs to pull updates from
 * - req.body.minDate: the minimum date of observations to pull; must be in the same year as maxDate
 * - req.body.maxDate: the maximum date of observations to pull; must be in the same year as minDate
 * Outputs:
 * - Stores a copy of the uploaded base dataset in /api/data/uploads, accessible at the /api/uploads endpoint
 * - Creates a new CSV observation dataset in /api/data/observations, accessible at the /api/observations endpoint
 */
tasksRouter.post('/observations', upload.single('file'), async (req, res, next) => {
    // Check that required fields exist
    if (!req.file || !req.body || !req.body.sources || !req.body.minDate || !req.body.maxDate) {
        res.status(400).send({
            error: 'Missing required request field'
        })
        return
    }

    try {
        // URI of the uploaded base dataset--not the file location
        const datasetURI = `/api/uploads/${req.file.filename}`

        // Parse sources argument and check basic validity
        const sources = req.body.sources.split(',')
        for (const source of sources) {
            if (!parseInt(source)) {
                res.status(400).send({
                    error: 'Request field \'sources\' must be a number or a comma-separated list of numbers'
                })
                return
            }
        }

        // Parse minDate and maxDate arguments and check same-year requirement
        const minDate = new Date(req.body.minDate)
        const maxDate = new Date(req.body.maxDate)
        if (minDate.getUTCFullYear() !== maxDate.getUTCFullYear()) {
            res.status(400).send({
                error: 'The \'minDate\' and \'maxDate\' request fields must have the same year'
            })
            return
        }
        // Format dates how the API (and iNaturalist) expect (YYYY-MM-DD)
        const formattedMinDate = `${minDate.getUTCFullYear()}-${(minDate.getUTCMonth() + 1).toString().padStart(2, '0')}-${minDate.getUTCDate().toString().padStart(2, '0')}`
        const formattedMaxDate = `${maxDate.getUTCFullYear()}-${(maxDate.getUTCMonth() + 1).toString().padStart(2, '0')}-${maxDate.getUTCDate().toString().padStart(2, '0')}`

        // Create task and send its ID to the RabbitMQ server
        const { id: taskId } = await createTask('observations', datasetURI, sources, formattedMinDate, formattedMaxDate)
        const task = await getTaskById(taskId)

        const channel = getObservationsChannel()
        channel.sendToQueue(observationsQueueName, Buffer.from(taskId.toString()))

        // Return 'Accepted' response and HATEOAS link
        res.status(202).send({
            uri: `/api/tasks/${task._id}`,
            createdAt: task.createdAt
        })
    } catch (err) {
        // Forward to 500-code middleware
        next(err)
    }
})

/*
 * POST /api/tasks/labels
 * Creates a task to create a PDF document of bee labels from a provided observation dataset
 * Requires:
 * - req.file: a CSV observations dataset from which to make labels
 * Outputs:
 * - Stores a copy of the uploaded base dataset in /api/data/uploads, accessible at the /api/uploads endpoint
 * - Creates a PDF document of bee labels in /api/data/labels, accessible at the /api/labels endpoint
 */
tasksRouter.post('/labels', upload.single('file'), async (req, res, next) => {
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

        // Create task and send its ID to the RabbitMQ server
        const { id: taskId } = await createTask('labels', datasetURI)
        const task = await getTaskById(taskId)

        const channel = getLabelsChannel()
        channel.sendToQueue(labelsQueueName, Buffer.from(taskId.toString()))

        // Return 'Accepted' response and HATEOAS link
        res.status(202).send({
            uri: `/api/tasks/${task._id}`,
            createdAt: task.createdAt
        })
    } catch (err) {
        // Forward to 500-code middleware
        next(err)
    }
})

/*
 * GET /api/tasks
 * Returns a list of all current and previous tasks stored on the Mongo server
 */
tasksRouter.get('/', async (req, res, next) => {
    try {
        const tasks = await getTasks()
        res.status(200).send({
            tasks
        })
    } catch (err) {
        // Forward to 500-code middleware
        next(err)
    }
})

/*
 * GET /api/tasks/:id
 * Returns a current or previous task on the Mongo server, referenced by ID
 */
tasksRouter.get('/:id', async (req, res, next) => {
    try {
        const task = await getTaskById(req.params.id)
        if (task) {
            res.status(200).send({
                task
            })
        } else {
            next()
        }
    } catch (err) {
        // Forward to 500-code middleware
        next(err)
    }
})

export default tasksRouter