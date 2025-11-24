import amqp from 'amqplib'

import { messageBroker } from '../config/environment.js'

class QueueManager {
    constructor() {
        this.connection = null
        this.channel = null
    }

    async connect(retries = 5) {
        try {
            this.connection = await amqp.connect(messageBroker.uri, { heartbeat: 60 })

            this.channel = await this.connection.createChannel()
            await this.channel.assertQueue(messageBroker.queueName, { durable: true })
            await this.channel.purgeQueue(messageBroker.queueName)

            console.log('Connected to RabbitMQ')
        } catch (error) {
            if (retries > 0) {
                console.error('RabbitMQ connection failed. Retrying...')
                
                await new Promise(resolve => setTimeout(resolve, 2000))
                return this.connect(retries - 1)
            }
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