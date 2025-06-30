
import { connectToDb } from './api/lib/mongo.js'
import { connectToRabbitMQ, getTasksChannel, tasksQueueName } from './api/lib/rabbitmq.js'
import { getTaskById } from './api/models/task.js'
import { clearBlankRows } from './api/lib/utilities.js'
import { updateTaskInProgress } from './api/models/task.js'
import processObservationsTask from './api/lib/observations.js'
import processLabelsTask from './api/lib/labels.js'
import processAddressesTask from './api/lib/addresses.js'
import processEmailsTask from './api/lib/emails.js'

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

            await updateTaskInProgress(taskId, { currentStep: 'Clearing blank records from uploaded file' })
            console.log('\tClearing blank records from uploaded file...')

            const datasetFilePath = `./api/data/uploads/${task.dataset.split('/').pop()}`
            await clearBlankRows(datasetFilePath)

            try {
                if (task.type === 'observations') {
                    await processObservationsTask(task)
                } else if (task.type === 'labels') {
                    await processLabelsTask(task)
                } else if (task.type === 'addresses') {
                    await processAddressesTask(task)
                } else if (task.type === 'emails') {
                    await processEmailsTask(task)
                }
            } catch (err) {
                console.error(err)
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