import 'dotenv/config'
import path from 'path'
import { Worker } from 'worker_threads'

import { database, port } from '../shared/lib/config/environment.js'
import { ValidationError } from '../shared/lib/utils/errors.js'
import { AdminService, OccurrenceService } from '../shared/lib/services/index.js'
import DatabaseManager from '../shared/lib/database/DatabaseManager.js'
import QueueManager from '../shared/lib/messaging/QueueManager.js'
import app from './app.js'

// Connect to MongoDB
await DatabaseManager.initialize()

// Connect to RabbitMQ
await QueueManager.connect()

console.log('Initializing database collections...')

// Insert root admin
try {
    await AdminService.createAdmin(database.adminUsername, database.adminPassword)
} catch (error) {
    if (!(error instanceof ValidationError)) {
        console.error('Error while attempting to insert root admin:', error)
        throw error
    }
}

const occurrenceCount = await OccurrenceService.count()
if (occurrenceCount === 0) {
    // Delete previous occurrences from database
    await OccurrenceService.deleteOccurrences()
    // Read occurrences from working file into database
    await OccurrenceService.createOccurrencesFromFile(path.resolve('./shared/data/workingOccurrences.csv'))
}

console.log('Database initialized')

// Create a worker thread to write into workingOccurrences from the database periodically
setInterval(() => {
    const worker = new Worker('./src/writeWorkingOccurrences.js', {
        stdout: true,
        stderr: true
    })

    worker.on('message', (result) => {
        console.log('[Worker]:', result)
    })

    worker.on('error', (error) => {
        console.error('[Worker]:', error)
    })

    worker.stdout.on('data', (data) => {
        console.log('[Worker.stdout]:', data.toString().trim())
    })

    worker.stderr.on('data', (data) => {
        console.error('[Worker.stderr]:', data.toString().trim())
    })
}, 24 * 60 * 60 * 1000)  // 24 hours

app.listen(port, () => {
    console.log('Listening on port ' + port + '...')
})