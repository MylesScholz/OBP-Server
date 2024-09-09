import Router from 'express'

import upload from './lib/multer.js'
import { getObservationsChannel, observationsQueueName, getLabelsChannel, labelsQueueName } from './lib/rabbitmq.js'
import { createTask, getTaskById, getTasks } from './models/task.js'

const tasksRouter = Router()

tasksRouter.post('/observations', upload.single('file'), async (req, res, next) => {
    if (!req.file || !req.body || !req.body.sources || !req.body.minDate || !req.body.maxDate) {
        res.status(400).send({
            error: 'Missing required request field'
        })
        return
    }

    try {
        const datasetURI = `/uploads/${req.file.filename}`
        const sources = req.body.sources.split(',')
        for (const source of sources) {
            if (!parseInt(source)) {
                res.status(400).send({
                    error: 'Request field \'sources\' must be a number or a comma-separated list of numbers'
                })
                return
            }
        }

        const minDate = new Date(req.body.minDate)
        const maxDate = new Date(req.body.maxDate)
        if (minDate.getUTCFullYear() !== maxDate.getUTCFullYear()) {
            res.status(400).send({
                error: 'The \'minDate\' and \'maxDate\' request fields must have the same year'
            })
            return
        }
        const formattedMinDate = `${minDate.getUTCFullYear()}-${(minDate.getUTCMonth() + 1).toString().padStart(2, '0')}-${minDate.getUTCDate().toString().padStart(2, '0')}`
        const formattedMaxDate = `${maxDate.getUTCFullYear()}-${(maxDate.getUTCMonth() + 1).toString().padStart(2, '0')}-${maxDate.getUTCDate().toString().padStart(2, '0')}`

        const { id: taskId } = await createTask('observations', datasetURI, sources, formattedMinDate, formattedMaxDate)
        const task = await getTaskById(taskId)

        const channel = getObservationsChannel()
        channel.sendToQueue(observationsQueueName, Buffer.from(taskId.toString()))

        res.status(202).send({
            uri: `/tasks/${task._id}`,
            createdAt: task.createdAt
        })
    } catch (err) {
        next(err)
    }
})

tasksRouter.post('/labels', upload.single('file'), async (req, res, next) => {
    if (!req.file) {
        res.status(400).send({
            error: 'Missing required request field'
        })
        return
    }

    try {
        const datasetURI = `/uploads/${req.file.filename}`

        const { id: taskId } = await createTask('labels', datasetURI)
        const task = await getTaskById(taskId)

        const channel = getLabelsChannel()
        channel.sendToQueue(labelsQueueName, Buffer.from(taskId.toString()))

        res.status(202).send({
            uri: `/tasks/${task._id}`,
            createdAt: task.createdAt
        })
    } catch (err) {
        next(err)
    }
})

tasksRouter.get('/', async (req, res, next) => {
    try {
        const tasks = await getTasks()
        res.status(200).send({
            tasks
        })
    } catch (err) {
        next(err)
    }
})

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
        next(err)
    }
})

export default tasksRouter