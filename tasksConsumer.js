
import { connectToDb } from './api/lib/mongo.js'
import { connectToRabbitMQ, getTasksChannel, tasksQueueName } from './api/lib/rabbitmq.js'
import { getTaskById } from './api/models/task.js'
import processObservationsTask from './api/lib/observations.js'
import processLabelsTask from './api/lib/labels.js'
import processAddressesTask from './api/lib/addresses.js'

async function main() {
    try {
        const tasksChannel = getTasksChannel()

        console.log(`Consuming queue '${tasksQueueName}'...`)
        tasksChannel.consume(tasksQueueName, async (msg) => {
            if (!msg) { return }

            const taskId = msg.content.toString()
            const task = await getTaskById(taskId)

            // ACK immediately to prevent timeout
            tasksChannel.ack(msg)

            console.log(`${new Date().toLocaleTimeString('en-US')} Processing task ${taskId}...`)

            if (task.type === 'observations') {
                await processObservationsTask(task)
            } else if (task.type === 'labels') {
                await processLabelsTask(task)
            } else if (task.type === 'addresses') {
                await processAddressesTask(task)
            }

            console.log(`${new Date().toLocaleTimeString('en-US')} Completed task ${taskId}`)
        })
    } catch (err) {
        // console.error(err)
        throw err
    }
}

connectToDb().then(async () => {
    await connectToRabbitMQ()
    main()
})