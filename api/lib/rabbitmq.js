import amqp from 'amqplib'
import 'dotenv/config'

// RabbitMQ server network address
const rabbitmqHost = process.env.RABBITMQ_HOST || 'localhost'
const rabbitmqURL = `amqp://${rabbitmqHost}`

const tasksQueueName = 'tasks'
let _tasksChannel = null

/*
 * connectToRabbitMQ()
 * Creates a connection to the RabbitMQ server specified by the environment variables; also, establishes channels and queues
 */
async function connectToRabbitMQ() {
    const connection = await amqp.connect(rabbitmqURL)

    _tasksChannel = await connection.createChannel()
    await _tasksChannel.assertQueue(tasksQueueName)
    // Empty the queue since unacked tasks are not persistent
    _tasksChannel.purgeQueue(tasksQueueName)
}

/*
 * getTasksChannel()
 * Returns the channel for tasks
 */
function getTasksChannel() {
    return _tasksChannel
}

export { connectToRabbitMQ, getTasksChannel, tasksQueueName }