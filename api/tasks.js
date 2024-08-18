import Router from 'express'

import upload from './lib/multer.js'
import { getObservationsChannel, observationsQueueName, getLabelsChannel, labelsQueueName } from './lib/rabbitmq.js'
import { createTask, getTaskById, getTasks } from './lib/datastore.js'

const tasksRouter = Router()

tasksRouter.post('/', upload.single('file'), (req, res, next) => {
    if (!req.file || !req.body || !req.body.type) {
        res.status(400).send({
            error: 'Missing required request field'
        })
        return
    }

    const datasetURI = `/data/uploads/${req.file.filename}`
    const { id: taskId, error } = createTask(req.body.type, datasetURI)
    if (error) {
        res.status(400).send(error)
        return
    }

    const task = getTaskById(taskId)
    if (req.body.type === 'observations') {
        const channel = getObservationsChannel()
        channel.sendToQueue(observationsQueueName, Buffer.from(`./api${datasetURI}`))        
    } else if (req.body.type === 'labels') {
        const channel = getLabelsChannel()
        channel.sendToQueue(labelsQueueName, Buffer.from(`./api${datasetURI}`))
    }

    res.status(202).send({
        taskId: task.id,
        status: task.status,
        createdAt: task.createdAt
    })
})

tasksRouter.get('/', (req, res, next) => {
    res.status(200).send({
        tasks: getTasks()
    })
})

tasksRouter.get('/:id', (req, res, next) => {
    const task = getTaskById(req.params.id)
    if (task) {
        res.status(200).send({
            task: task
        })
    } else {
        next()
    }
})

export default tasksRouter