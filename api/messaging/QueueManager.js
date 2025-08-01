import amqp from 'amqplib'

import { messageBroker } from '../config/environment.js'

class QueueManager {
    constructor() {
        this.connection = null
        this.channel = null
    }

    async connect() {
        try {
            this.connection = await amqp.connect(messageBroker.uri)
            this.channel = await this.connection.createChannel()

            await this.channel.assertQueue(messageBroker.queueName, { durable: true })

            console.log('Connected to RabbitMQ')
        } catch (error) {
            console.error('RabbitMQ connection failed:', error)
            throw error
        }
    }

    async publishMessage(data) {
        if (!this.channel) {
            throw new Error('Not connected to RabbitMQ')
        }

        const sent = this.channel.sendToQueue(
            messageBroker.queueName,
            Buffer.from(data),
            { persistent: false }
        )

        return sent
    }

    async close() {
        if (this.connection) {
            await this.connection.close()
        }
    }
}

export default new QueueManager()