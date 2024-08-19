import amqp from 'amqplib'
import 'dotenv/config'

import { connectToDb, getDb } from './api/lib/mongo.js'
import { observationsQueueName } from './api/lib/rabbitmq.js'
import { getTaskById, updateTaskInProgress, updateTaskResult } from './api/models/task.js'

const rabbitmqHost = process.env.RABBITMQ_HOST || 'localhost'
const rabbitmqURL = `amqp://${rabbitmqHost}`

async function main() {
    try {
        await connectToDb()
        const db = getDb()

        const connection = await amqp.connect(rabbitmqURL)
        const observationsChannel = await connection.createChannel()
        await observationsChannel.assertQueue(observationsQueueName)

        console.log(`Consuming queue '${observationsQueueName}'...`)
        observationsChannel.consume(observationsQueueName, async (msg) => {
            if (msg) {
                const taskId = msg.content.toString()
                const task = getTaskById(taskId)

                console.log('Consuming task', taskId)
                updateTaskInProgress(taskId, { currentStep: 'Pulling observations from iNaturalist' })

                /* TODO: Pull iNaturalist observations */

                updateTaskInProgress(taskId, { currentStep: 'Merging new observations with provided dataset' })
                
                /* TODO: Merge new observations with task's dataset */

                updateTaskResult(taskId, { uri: '' })
                console.log('Completed task', taskId)
                observationsChannel.ack(msg)
            }
        })
    } catch (err) {
        console.error(err)
    }
}

main()