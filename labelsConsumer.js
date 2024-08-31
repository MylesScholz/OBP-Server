import Crypto from 'node:crypto'
import fs from 'fs'
import amqp from 'amqplib'
import { parse } from 'csv-parse/sync'
import PDFDocument from 'pdfkit'
import bwipjs from 'bwip-js'
import 'dotenv/config'

import { connectToDb, getDb } from './api/lib/mongo.js'
import { labelsQueueName } from './api/lib/rabbitmq.js'
import { getTaskById, updateTaskInProgress, updateTaskResult } from './api/models/task.js'

const rabbitmqHost = process.env.RABBITMQ_HOST || 'localhost'
const rabbitmqURL = `amqp://${rabbitmqHost}`

function readObservationsFile(filePath) {
    const observationsBuffer = fs.readFileSync(filePath)
    const observations = parse(observationsBuffer, { columns: true })

    return observations
}

function writePDFPage(observations, doc) {

}

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
                const task = await getTaskById(taskId)

                console.log(`Processing task ${taskId} (${task.type})...`)
                updateTaskInProgress(taskId, { currentStep: 'Generating labels from provided dataset' })
                console.log('\tGenerating labels from provided dataset...')

                // TODO: starting and ending rows

                const observations = readObservationsFile('./api/data' + task.dataset)

                const nRows = 25
                const nColumns = 10
                const partitionSize = nRows * nColumns
                const nPartitions = Math.floor(observations.length / partitionSize) + 1
                let partitionStart = 0
                let partitionEnd = partitionSize
                let currentPage = 1

                if (partitionEnd > observations.length) {
                    partitionEnd = observations.length
                }

                const resultFileName = `${Crypto.randomUUID()}.pdf`
                const doc = new PDFDocument()
                doc.pipe(fs.createWriteStream(`./api/data/labels/${resultFileName}`))
                while (partitionStart < observations.length) {
                    writePDFPage(observations.slice(partitionStart, partitionEnd), doc)

                    partitionStart = partitionEnd
                    partitionEnd += partitionSize
                    if (partitionEnd > observations.length) {
                        partitionEnd = observations.length
                    }
                    currentPage++
                }
                doc.end()

                updateTaskResult(taskId, { uri: `/labels/${resultFileName}` })
                console.log('Completed task', taskId)
                labelsChannel.ack(msg)
            }
        })
    } catch (err) {
        console.error(err)
    }
}

main()