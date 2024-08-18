import amqp from 'amqplib'

const rabbitmqHost = process.env.RABBITMQ_HOST || 'localhost'
const rabbitmqUrl = `amqp://${rabbitmqHost}`

const observationsQueueName = 'observations'
let observationsChannel

const labelsQueueName = 'labels'
let labelsChannel

async function connectToRabbitMQ() {
    const connection = await amqp.connect(rabbitmqUrl)

    observationsChannel = await connection.createChannel()
    await observationsChannel.assertQueue(observationsQueueName)
    observationsChannel.purgeQueue(observationsQueueName)

    labelsChannel = await connection.createChannel()
    await labelsChannel.assertQueue(labelsQueueName)
    observationsChannel.purgeQueue(labelsQueueName)
}

function getObservationsChannel() {
    return observationsChannel
}

function getLabelsChannel() {
    return labelsChannel
}

export { connectToRabbitMQ, getObservationsChannel, observationsQueueName, getLabelsChannel, labelsQueueName }