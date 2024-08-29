import amqp from 'amqplib'
import { PDFDocument } from 'pdfkit'
import { bwipjs } from 'bwip-js'
import 'dotenv/config'

import { connectToDb, getDb } from './api/lib/mongo.js'
import { labelsQueueName } from './api/lib/rabbitmq.js'
import { getTaskById, updateTaskInProgress } from './api/models/task.js'

const rabbitmqHost = process.env.RABBITMQ_HOST || 'localhost'
const rabbitmqURL = `amqp://${rabbitmqHost}`

async function main() {
    try {
        await connectToDb()

        const connection = await amqp.connect(rabbitmqURL)
        const labelsChannel = await connection.createChannel()
        await labelsChannel.assertQueue(labelsQueueName)

        console.log(`Consuming queue '${labelsQueueName}'...`)
        labelsChannel.consume(labelsQueueName, async (msg) => {
            if (msg) {
                const taskId = msg.content.toString()
                const task = getTaskById(taskId)

                console.log(`Processing task ${taskId} (${task.type})...`)
                updateTaskInProgress(taskId, { currentStep: 'Generating labels from provided dataset' })
                console.log('\tGenerating labels from provided dataset...')

                /* TODO: Generate labels from task's dataset */

                updateTaskResult(taskId, { uri: `/labels/` })
                console.log('Completed task', taskId)
                labelsChannel.ack(msg)
            }
        })
    } catch (err) {
        console.error(err)
    }
}

main()