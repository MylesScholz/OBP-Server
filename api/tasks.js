import Router from 'express'

import upload from './lib/multer.js'
import { getObservationsChannel, observationsQueueName, getLabelsChannel, labelsQueueName } from './lib/rabbitmq.js'
import { createTask, getTaskById, getTasks } from './models/task.js'

const tasksRouter = Router()

tasksRouter.post('/', upload.single('file'), async (req, res, next) => {
    if (!req.file || !req.body || !req.body.type) {
        res.status(400).send({
            error: 'Missing required request field'
        })
        return
    }
    if (req.body.type === 'observations' && (!req.query.sources || !req.query.minDate || !req.query.maxDate)) {
        res.status(400).send({
            error: 'Tasks of type \'observations\' must have \'sources\', \'minDate\', and \'maxDate\' query parameters'
        })
        return
    }

    try {
        const datasetURI = `/uploads/${req.file.filename}`
        const sources = req.query.sources ? req.query.sources.split(',') : null

        const minDate = new Date(req.query.minDate)
        const maxDate = new Date(req.query.maxDate)
        if (minDate.getFullYear() !== maxDate.getFullYear()) {
            res.status(400).send({
                error: 'The \'minDate\' and \'maxDate\' query parameters must have the same year'
            })
        }
        const formattedMinDate = `${minDate.getUTCFullYear()}-${(minDate.getUTCMonth() + 1).toString().padStart(2, '0')}-${minDate.getUTCDate().toString().padStart(2, '0')}`
        const formattedMaxDate = `${maxDate.getUTCFullYear()}-${(maxDate.getUTCMonth() + 1).toString().padStart(2, '0')}-${maxDate.getUTCDate().toString().padStart(2, '0')}`

        const { id: taskId } = await createTask(req.body.type, datasetURI, sources, formattedMinDate, formattedMaxDate)
        const task = await getTaskById(taskId)

        if (req.body.type === 'observations') {
            const channel = getObservationsChannel()
            channel.sendToQueue(observationsQueueName, Buffer.from(taskId.toString()))        
        } else if (req.body.type === 'labels') {
            const channel = getLabelsChannel()
            channel.sendToQueue(labelsQueueName, Buffer.from(taskId.toString()))
        }

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