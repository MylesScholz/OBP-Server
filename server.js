import express from 'express'
import morgan from 'morgan'
import cors from 'cors'
import 'dotenv/config'

import tasksRouter from './api/tasks.js'
import { connectToRabbitMQ } from './api/lib/rabbitmq.js'
import { connectToDb } from './api/lib/mongo.js'
import { clearTasks } from './api/models/task.js'
import { clearDirectory } from './api/lib/utilities.js'

const port = process.env.PORT || '8080'
// Router for website
const app = express()
// Router for API requests
const apiRouter = express.Router()

// Enable all Cross-Origin Resource Sharing (CORS), including pre-flight requests
app.use(cors())

// Request logging
app.use(morgan('dev'))

// JSON request body parsing
app.use(express.json())

// Static serving
app.use(express.static('public'))
app.use(express.static('dist'))

// API routes
apiRouter.use('/uploads', express.static('api/data/uploads'))
apiRouter.use('/observations', express.static('api/data/observations'))
apiRouter.use('/labels', express.static('api/data/labels'))
apiRouter.use('/tasks', tasksRouter)
app.use('/api', apiRouter)

app.use('*', (req, res, next) => {
    res.status(404).send({
        error: `Requested operation '${req.method} ${req.originalUrl}' does not exist`
    })
})

app.use('*', (err, req, res, next) => {
    console.error('ERROR:', err)
    res.status(500).send({
        error: 'Unable to complete the request because of a server error'
    })
})

connectToDb().then(async () => {
    // Tasks are not persistent between server restarts, so clear the database and local files
    await clearTasks()
    clearDirectory('./api/data/uploads')
    clearDirectory('./api/data/observations')
    clearDirectory('./api/data/labels')
    clearDirectory('./api/data/temp')

    await connectToRabbitMQ()

    app.listen(port, () => {
        console.log('Listening on port ' + port + '...')
    })
})