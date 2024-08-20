import vhost from 'vhost'
import express from 'express'
import morgan from 'morgan'
import 'dotenv/config'

import observationsRouter from './api/observations.js'
import labelsRouter from './api/labels.js'
import tasksRouter from './api/tasks.js'
import { connectToRabbitMQ } from './api/lib/rabbitmq.js'
import { connectToDb } from './api/lib/mongo.js'
import { clearTasks } from './api/models/task.js'

const port = process.env.PORT || '8080'
const app = express()
const apiRouter = express.Router()

app.use(morgan('dev'))
app.use(express.json())
app.use(express.static('public'))
app.use(express.static('dist'))

// API routes
apiRouter.use('/observations', observationsRouter)
apiRouter.use('/labels', labelsRouter)
apiRouter.use('/tasks', tasksRouter)
app.use(vhost('api.*', apiRouter))

app.use('*', (req, res, next) => {
    res.status(404).send({
        error: `Requested resource "${req.originalUrl}" does not exist`
    })
})

app.use('*', (err, req, res, next) => {
    console.error('Error:', err)
    res.status(500).send({
        error: 'Unable to complete the request because of a server error'
    })
})

connectToDb().then(async () => {
    await clearTasks()
    await connectToRabbitMQ()

    // TODO: clear ./api/data folders

    app.listen(port, () => {
        console.log('Listening on port ' + port + '...')
    })
})