import 'dotenv/config'

import { database, port } from '../shared/lib/config/environment.js'
import { ValidationError } from '../shared/lib/utils/errors.js'
import { AdminService, TaskService } from '../shared/lib/services/index.js'
import DatabaseManager from '../shared/lib/database/DatabaseManager.js'
import QueueManager from '../shared/lib/messaging/QueueManager.js'
import app from './app.js'

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