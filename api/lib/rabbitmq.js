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

/*
 * connectToRabbitMQ()
 * Creates a connection to the RabbitMQ server specified by the environment variables; also, establishes channels and queues
 */
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

/*
 * getObservationsChannel()
 * Returns the channel for observations tasks
 */
function getObservationsChannel() {
    return _observationsChannel
}

/*
 * getLabelsChannel()
 * Returns the channel for labels tasks
 */
function getLabelsChannel() {
    return _labelsChannel
}

export { connectToRabbitMQ, getObservationsChannel, observationsQueueName, getLabelsChannel, labelsQueueName }