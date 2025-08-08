import amqp from 'amqplib'

import { messageBroker } from './api/config/environment.js'
import DatabaseManager from './api/database/DatabaseManager.js'
import { TaskService } from './api/services/index.js'
import { AddressesSubtaskHandler, EmailsSubtaskHandler, LabelsSubtaskHandler, ObservationsSubtaskHandler, OccurrencesSubtaskHandler } from './api/handlers/index.js'

class TaskConsumer {
    constructor() {
        this.connection = null
        this.channel = null
    }

    async connect() {
        try {
            this.connection = await amqp.connect(messageBroker.uri)
            this.channel = await this.connection.createChannel()

            await this.channel.assertQueue(messageBroker.queueName, { durable: true })

            // Fair dispatch - don't give new message until previous is processed
            this.channel.prefetch(1)

            console.log('Connected to RabbitMQ')
        } catch (error) {
            console.error('RabbitMQ connection failed:', error)
            throw error
        }
    }

    async startConsuming() {
        console.log(`Consuming queue '${messageBroker.queueName}'...`)

        await this.channel.consume(messageBroker.queueName, async (msg) => {
            if (!msg) return

            try {
                const taskId = msg.content.toString()

                // ACK immediately to prevent timeout
                this.channel.ack(msg)

                // Handle the task
                await this.handleTask(taskId)                
            } catch (error) {
                console.error('Error processing message:', error)

                // Reject and don't requeue (or requeue for retry)
                this.channel.nack(msg, false, false)
            }
        })
    }

    async handleTask(taskId) {
        console.log(`${new Date().toLocaleTimeString('en-US')} Processing task ${taskId}...`)

        try {
            const task = await TaskService.getTaskById(taskId)

            const occurrencesHandler = new OccurrencesSubtaskHandler()
            const observationsHandler = new ObservationsSubtaskHandler()
            const labelsHandler = new LabelsSubtaskHandler()
            const addressesHandler = new AddressesSubtaskHandler()
            const emailsHandler = new EmailsSubtaskHandler()

            for (const subtask of task.subtasks) {
                console.log(`\t${new Date().toLocaleTimeString('en-US')} Processing ${subtask.type} subtask...`)

                if (subtask.type === 'occurrences') {
                    await occurrencesHandler.handleTask(task._id)
                } else if (subtask.type === 'observations') {
                    await observationsHandler.handleTask(task._id)
                } else if (subtask.type === 'labels') {
                    await labelsHandler.handleTask(task._id)
                } else if (subtask.type === 'addresses') {
                    await addressesHandler.handleTask(task._id)
                } else if (subtask.type === 'emails') {
                    await emailsHandler.handleTask(task._id)
                }
            }

            await TaskService.completeTaskById(task._id)
        } catch (error) {
            console.error(`Error while processing task ${taskId}:`, error)
            TaskService.failTaskById(taskId)
        }

        console.log(`${new Date().toLocaleTimeString('en-US')} Completed task ${taskId}`)
    }
}

async function start() {
    const taskConsumer = new TaskConsumer()

    try {
        // Connect to MongoDB
        await DatabaseManager.initialize()
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