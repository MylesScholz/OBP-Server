import amqp from 'amqplib'
import 'dotenv/config'

const rabbitmqHost = process.env.RABBITMQ_HOST || 'localhost'
const rabbitmqURL = `amqp://${rabbitmqHost}`

const observationsQueueName = 'observations'
let _observationsChannel = null

const labelsQueueName = 'labels'
let _labelsChannel = null

async function connectToRabbitMQ() {
    const connection = await amqp.connect(rabbitmqURL)

    _observationsChannel = await connection.createChannel()
    await _observationsChannel.assertQueue(observationsQueueName)
    _observationsChannel.purgeQueue(observationsQueueName)

    _labelsChannel = await connection.createChannel()
    await _labelsChannel.assertQueue(labelsQueueName)
    _observationsChannel.purgeQueue(labelsQueueName)
}

function getObservationsChannel() {
    return _observationsChannel
}

function getLabelsChannel() {
    return _labelsChannel
}

export { connectToRabbitMQ, getObservationsChannel, observationsQueueName, getLabelsChannel, labelsQueueName }