import express from 'express'
import cookieParser from 'cookie-parser'
import morgan from 'morgan'
import cors from 'cors'
import 'dotenv/config'

import tasksRouter from './api/tasks.js'
import adminsRouter from './api/admins.js'
import usernamesRouter from './api/usernames.js'
import archiveRouter from './api/archive.js'
import { connectToRabbitMQ } from './api/lib/rabbitmq.js'
import { connectToDb } from './api/lib/mongo.js'
import { clearTasksWithoutFiles } from './api/models/task.js'
import { clearDirectory } from './api/lib/utilities.js'
import { requireAuthentication } from './api/lib/auth.js'

const port = process.env.PORT || '8080'
// Router for website
const app = express()
// Router for API requests
const apiRouter = express.Router()

// Enable all Cross-Origin Resource Sharing (CORS), including pre-flight requests
app.use(cors())

// Parse cookies
app.use(cookieParser())

// Request logging
app.use(morgan('dev'))

// JSON request body parsing
app.use(express.json())

// Static serving
app.use(express.static('public'))
app.use(express.static('dist'))

// API routes
apiRouter.use('/uploads', express.static('api/data/uploads'))
apiRouter.use('/occurrences', express.static('api/data/occurrences'))
apiRouter.use('/pulls', express.static('api/data/pulls'))
apiRouter.use('/flags', express.static('api/data/flags'))
apiRouter.use('/labels', express.static('api/data/labels'))
apiRouter.use('/addresses', requireAuthentication, express.static('api/data/addresses'))
apiRouter.use('/emails', requireAuthentication, express.static('api/data/emails'))
apiRouter.use('/archive', archiveRouter)
apiRouter.use('/tasks', tasksRouter)
apiRouter.use('/admins', adminsRouter)
apiRouter.use('/usernames', usernamesRouter)
app.use('/api', apiRouter)

app.use('*', (req, res, next) => {
    res.status(404).send({
        error: `Requested operation '${req.method} ${req.originalUrl}' does not exist`
    })
})

app.use('*', (err, req, res, next) => {
    console.error(err)
    res.status(500).send({
        error: 'Unable to complete the request because of a server error'
    })
})

connectToDb().then(async () => {
    // Clean up temp files and tasks with archived files
    clearDirectory('./api/data/temp')
    clearTasksWithoutFiles()

    await connectToRabbitMQ()

    app.listen(port, () => {
        console.log('Listening on port ' + port + '...')
    })
})