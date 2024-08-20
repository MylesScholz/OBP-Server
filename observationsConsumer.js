import amqp from 'amqplib'
import 'dotenv/config'

import { connectToDb, getDb } from './api/lib/mongo.js'
import { observationsQueueName } from './api/lib/rabbitmq.js'
import { getTaskById, updateTaskInProgress, updateTaskResult } from './api/models/task.js'

const rabbitmqHost = process.env.RABBITMQ_HOST || 'localhost'
const rabbitmqURL = `amqp://${rabbitmqHost}`

async function fetchObservations(sourceId, minDate, maxDate, page) {
    const res = await fetch(`https://api.inaturalist.org/v1/observations?project_id=${sourceId}&d1=${minDate}&d2=${maxDate}&per_page=200&page=${page}`)
    return await res.json()
}

async function pullSourceObservations(sourceId, minDate, maxDate) {
    let response = await fetchObservations(sourceId, minDate, maxDate, 1)
    let results = response["results"]

    const totalResults = parseInt(response["total_results"])
    let totalPages = Math.floor(totalResults / 200) + 1

    for (let i = 2; i < totalPages + 1; i++) {
        response = await fetchObservations(sourceId, minDate, maxDate, i)
        results = results.concat(response["results"])
    }

    return results
}

async function pullObservations(task) {
    let observations = []

    for (const sourceId of task.sources) {
        observations = observations.concat(await pullSourceObservations(sourceId, task.minDate, task.maxDate))
    }

    return observations

}

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
                const task = await getTaskById(taskId)

                console.log(`Processing task ${taskId}...`)
                updateTaskInProgress(taskId, { currentStep: 'Pulling observations from iNaturalist' })

                const observations = await pullObservations(task)

                updateTaskInProgress(taskId, { currentStep: 'Formatting new observations' })

                /* TODO: Format new observations */

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