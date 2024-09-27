import amqp from 'amqplib'
import 'dotenv/config'

// RabbitMQ server network address
const rabbitmqHost = process.env.RABBITMQ_HOST || 'localhost'
const rabbitmqURL = `amqp://${rabbitmqHost}`

// Separate queues and channels for observations tasks and labels tasks
const observationsQueueName = 'observations'
let _observationsChannel = null

const labelsQueueName = 'labels'
let _labelsChannel = null

async function connectToRabbitMQ() {
    const connection = await amqp.connect(rabbitmqURL)

    _observationsChannel = await connection.createChannel()
    await _observationsChannel.assertQueue(observationsQueueName)
    // Empty the queue since tasks are not persistent
    _observationsChannel.purgeQueue(observationsQueueName)

    _labelsChannel = await connection.createChannel()
    await _labelsChannel.assertQueue(labelsQueueName)
    // Empty the queue since tasks are not persistent
    _observationsChannel.purgeQueue(labelsQueueName)
}

function getObservationsChannel() {
    return _observationsChannel
}

function getLabelsChannel() {
    return _labelsChannel
}

export { connectToRabbitMQ, getObservationsChannel, observationsQueueName, getLabelsChannel, labelsQueueName }