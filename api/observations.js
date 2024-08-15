import Router from 'express'

import upload from './lib/multer.js'
import { getObservationsChannel, observationsQueueName } from './lib/rabbitmq.js'

const observationsRouter = Router()

observationsRouter.get('/', upload.single('file'), (req, res, next) => {
    if (req.file) {
        const channel = getObservationsChannel()
        channel.sendToQueue(observationsQueueName, Buffer.from(req.file.filename))

        res.status(200).send("OK")
    } else {
        res.status(400).send({
            error: 'Missing required CSV file upload'
        })
    }
})

export default observationsRouter