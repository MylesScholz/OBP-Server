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

    try {
        const datasetURI = `/data/uploads/${req.file.filename}`
        const { id: taskId } = await createTask(req.body.type, datasetURI)
        const task = await getTaskById(taskId)

        if (req.body.type === 'observations') {
            const channel = getObservationsChannel()
            channel.sendToQueue(observationsQueueName, Buffer.from(`./api${datasetURI}`))        
        } else if (req.body.type === 'labels') {
            const channel = getLabelsChannel()
            channel.sendToQueue(labelsQueueName, Buffer.from(`./api${datasetURI}`))
        }

        res.status(202).send({
            taskId: task._id,
            status: task.status,
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