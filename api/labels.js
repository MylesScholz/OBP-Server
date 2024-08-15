import Router from 'express'

import upload from './lib/multer.js'
import { getLabelsChannel, labelsQueueName } from './lib/rabbitmq.js'

const labelsRouter = Router()

labelsRouter.get('/', upload.single('file'), (req, res, next) => {
    if (req.file) {
        const channel = getLabelsChannel()
        channel.sendToQueue(labelsQueueName, Buffer.from(req.file.filename))

        res.status(200).send("OK")
    } else {
        res.status(400).send({
            error: 'Missing required CSV file upload'
        })
    }
})

export default labelsRouter