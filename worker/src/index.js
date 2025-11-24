import DatabaseManager from '../shared/lib/database/DatabaseManager.js'
import TaskConsumer from './TaskConsumer.js'

async function start() {
    const taskConsumer = new TaskConsumer()

    try {
        // Connect to MongoDB
        await DatabaseManager.initialize({ skipIndexes: true, skipViews: true })
        // Connect to RabbitMQ
        await taskConsumer.connect()

        // Start consuming tasks
        await taskConsumer.startConsuming()

        console.log('Consumer is running...')
    } catch (error) {
        console.error('Failed to start consumer:', error)
        process.exit(1)
    }
}

start()