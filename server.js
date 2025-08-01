import express from 'express'
import cookieParser from 'cookie-parser'
import morgan from 'morgan'
import cors from 'cors'
import 'dotenv/config'

import { requireAuthentication } from './api/middleware/auth.js'
import apiRouter from './api/routes/index.js'
import DatabaseManager from './api/database/DatabaseManager.js'
import TaskService from './api/services/TaskService.js'
import QueueManager from './api/messaging/QueueManager.js'
import { database, port } from './api/config/environment.js'
import AdminService from './api/services/AdminService.js'
import { ValidationError } from './api/utils/errors.js'

// Router for website
const app = express()

// Enable all Cross-Origin Resource Sharing (CORS), including pre-flight requests
app.use(cors())

// Parse cookies
app.use(cookieParser())

// Request logging
app.use(morgan('dev'))

// JSON request body parsing
app.use(express.json())

// Static website serving
app.use(express.static('public'))
app.use(express.static('dist'))

// API routes
apiRouter.use('/uploads', express.static('api/data/uploads'))
apiRouter.use('/occurrences', express.static('api/data/occurrences'))
apiRouter.use('/pulls', express.static('api/data/pulls'))
apiRouter.use('/flags', express.static('api/data/flags'))
apiRouter.use('/duplicates', express.static('api/data/duplicates'))
apiRouter.use('/labels', express.static('api/data/labels'))
apiRouter.use('/addresses', requireAuthentication, express.static('api/data/addresses'))
apiRouter.use('/emails', requireAuthentication, express.static('api/data/emails'))
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

// Connect to MongoDB
await DatabaseManager.initialize()

// Connect to RabbitMQ
await QueueManager.connect()

// Clean up tasks with archived files
await TaskService.deleteTasksWithoutFiles()

// Insert root admin
try {
    await AdminService.createAdmin(database.adminUsername, database.adminPassword)
} catch (error) {
    if (!(error instanceof ValidationError)) {
        console.error('Error while attempting to insert root admin:', error)
        throw error
    }
}

app.listen(port, () => {
    console.log('Listening on port ' + port + '...')
})