import DatabaseManager from '../shared/lib/database/DatabaseManager.js'
import QueueManager from '../shared/lib/messaging/QueueManager.js'
import { default as TaskService } from '../shared/lib/services/TaskService.js'
import { parentPort } from 'worker_threads'

async function writeWorkingOccurrences() {
    try {
        // Connect to MongoDB
        await DatabaseManager.initialize({ skipIndexes: true, skipViews: true })
        
        // Connect to RabbitMQ
        await QueueManager.connect()

        // Create task and send its ID to the RabbitMQ queue
        const subtasks = [
            {
                type: 'syncOccurrences',
                operation: 'write',
                file: 'workingOccurrences'
            }
        ]
        await TaskService.createTask(subtasks)

        parentPort.postMessage({ success: true })
    } catch (error) {
        console.error(error)
        parentPort.postMessage({ success: false, error })
    }
}

await writeWorkingOccurrences()