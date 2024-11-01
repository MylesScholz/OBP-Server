import Crypto from 'node:crypto'
import fs from 'fs'
import amqp from 'amqplib'
import { parse } from 'csv-parse/sync'
import { PageSizes, PDFDocument, degrees } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import { datamatrixrectangularextension } from 'bwip-js/node'
import 'dotenv/config'

import { connectToDb } from './api/lib/mongo.js'
import { labelsQueueName } from './api/lib/rabbitmq.js'
import { clearTasksWithoutFiles, getTaskById, updateTaskInProgress, updateTaskResult, updateTaskWarning } from './api/models/task.js'
import { connectToS3, getS3Object } from './api/lib/aws-s3.js'
import { limitFilesInDirectory } from './api/lib/utilities.js'

const MAX_LABELS = 10

const nRows = 25
const nColumns = 10

const PostScriptPointsPerInch = 72
const letterPaperWidth = 8.5 * PostScriptPointsPerInch
const letterPaperHeight = 11 * PostScriptPointsPerInch

const horizontalMargin = 0.25 * PostScriptPointsPerInch
const verticalMargin = 0.5 * PostScriptPointsPerInch

const labelWidth = 0.666 * PostScriptPointsPerInch
const labelHeight = 0.311 * PostScriptPointsPerInch

const horizontalSpacing = (letterPaperWidth - (2 * horizontalMargin) - (nColumns * labelWidth)) / (nColumns - 1)
const verticalSpacing = (letterPaperHeight - (2 * verticalMargin) - (nRows * labelHeight)) / (nRows - 1)

const rabbitmqHost = process.env.RABBITMQ_HOST || 'localhost'
const rabbitmqURL = `amqp://${rabbitmqHost}`

function readObservationsFile(filePath) {
    const observationsBuffer = fs.readFileSync(filePath)
    const observations = parse(observationsBuffer, { columns: true })

    return observations
}

function formatObservation(observation) {
    const formattedObservation = {}

    const country = observation['Country']
    const stateProvince = observation['State']
    const county = observation['County'] !== '' ? `:${observation['County']}Co` : ''
    const place = observation['Abbreviated Location']
    const latitude = observation['Dec. Lat.']
    const longitude = observation['Dec. Long.']
    const elevation = observation['Elevation']
    const locationText = `${country}:${stateProvince}${county} ${place} ${latitude} ${longitude} ${elevation}m`
    formattedObservation.location = locationText

    const day = observation['Collection Day 1']
    const month = observation['Month 1']
    const year = observation['Year 1']
    const sampleID = observation['Sample ID']
    const specimenID = observation['Specimen ID']
    const dateText = `${day}.${month}${year}-${sampleID}.${specimenID}`
    formattedObservation.date = dateText

    const firstInitial = observation['Collector - First Initial']
    const lastName = observation['Collector - Last Name']
    const nameText = `${firstInitial}${lastName}`
    formattedObservation.name = nameText

    const methodText = observation['Collection method']
    formattedObservation.method = methodText

    const numberText = observation['Observation No.']
    formattedObservation.number = numberText

    return formattedObservation
}

function formatObservations(observations, addWarningIndex) {
    const requiredFields = [
        'Country',
        'State',
        'Abbreviated Location',
        'Dec. Lat.',
        'Dec. Long.',
        'Elevation',
        'Collection Day 1',
        'Month 1',
        'Year 1',
        'Sample ID',
        'Specimen ID',
        'Collector - First Initial',
        'Collector - Last Name',
        'Collection method',
        'Observation No.'
    ]

    for (let i = 0; i < observations.length; i++) {
        const observation = observations[i]
        const formattedObservation = formatObservation(observation)

        if (
            requiredFields.some((field) => !observation[field]) ||
            observation['Country'].length > 3 ||
            observation['State'].length > 2 ||
            observation['County'].length > 15 ||
            observation['Abbreviated Location'].length > 22 ||
            observation['Dec. Lat.'].length > 8 ||
            observation['Dec. Long.'].length > 8 ||
            observation['Elevation'].length > 5 ||
            formattedObservation.location.length > 72 ||
            formattedObservation.date.length > 30 ||
            formattedObservation.name.length > 20 ||
            observation['Collection method'].length > 15
        ) {
            addWarningIndex(i)
        }

        observations[i] = formattedObservation
    }

    return observations
}

function addTextBox(page, text, basisX, basisY, textBoxLayout) {
    // page.drawRectangle({
    //     x: basisX + textBoxLayout.x,
    //     y: basisY + textBoxLayout.y,
    //     width: textBoxLayout.width,
    //     height: textBoxLayout.height,
    //     rotate: degrees(textBoxLayout.rotation),
    //     borderWidth: 0.1,
    //     opacity: 0
    // })

    let fontSize = textBoxLayout.fontSize
    let lineHeight = textBoxLayout.lineHeight
    let yOffset = textBoxLayout.offset.y
    if (textBoxLayout.fit) {
        let singleLineWidth = textBoxLayout.font.widthOfTextAtSize(text, fontSize)
        let approximateNumberOfLines = text.match(/ /g) ? Math.ceil(singleLineWidth / textBoxLayout.width) : 1
        let singleLineHeight = textBoxLayout.font.heightAtSize(fontSize, { descender: true })
        let approximateHeight = approximateNumberOfLines * singleLineHeight

        while ((approximateNumberOfLines === 1 && singleLineWidth > textBoxLayout.width) || (approximateNumberOfLines > 1 && approximateHeight > textBoxLayout.height) && fontSize > 1) {
            fontSize -= 0.01
            lineHeight = 0.85 * fontSize

            singleLineWidth = textBoxLayout.font.widthOfTextAtSize(text, fontSize)
            approximateNumberOfLines = text.match(/ /g) ? Math.ceil(singleLineWidth / textBoxLayout.width) : 1
            singleLineHeight = textBoxLayout.font.heightAtSize(fontSize, { descender: true })
            approximateHeight = approximateNumberOfLines * singleLineHeight

            yOffset = approximateHeight - (0.8 * singleLineHeight) - textBoxLayout.height
        }
    }

    page.drawText(text, {
        x: basisX + textBoxLayout.x + textBoxLayout.offset.x,
        y: basisY + textBoxLayout.y + textBoxLayout.height + yOffset,
        font: textBoxLayout.font,
        size: fontSize,
        lineHeight: lineHeight,
        rotate: degrees(textBoxLayout.rotation),
        maxWidth: textBoxLayout.width
    })
}

async function addDataMatrix(page, text, basisX, basisY, dataMatrixLayout) {
    // page.drawRectangle({
    //     x: basisX + dataMatrixLayout.x,
    //     y: basisY + dataMatrixLayout.y,
    //     width: dataMatrixLayout.width,
    //     height: dataMatrixLayout.height,
    //     borderWidth: 0.1,
    //     opacity: 0
    // })
    
    const png = await datamatrixrectangularextension({
        text: text,
        version: '8x18',
        rotate: 'L'
    })
    const image = await page.doc.embedPng(png)
    const scaledDimensions = image.scaleToFit(dataMatrixLayout.width, dataMatrixLayout.height)
    page.drawImage(image, {
        x: basisX + dataMatrixLayout.x,
        y: basisY + dataMatrixLayout.y,
        width: scaledDimensions.width,
        height: scaledDimensions.height
    })
}

async function getFontData(fontKey) {
    const fontData = await getS3Object('obp-server-data', fontKey)
    return await fontData?.transformToByteArray()
}

async function addLabel(page, observation, basisX, basisY, fonts) {
    // page.drawRectangle({
    //     x: basisX,
    //     y: basisY,
    //     width: labelWidth,
    //     height: labelHeight,
    //     borderWidth: 0.1,
    //     opacity: 0
    // })

    const locationText = observation.location ?? ''
    const locationLayout = {
        x: 0.005 * PostScriptPointsPerInch,
        y: 0.155 * PostScriptPointsPerInch,
        width: 0.46 * PostScriptPointsPerInch,
        height: 0.151 * PostScriptPointsPerInch,
        font: fonts.gillSansCondensedFont,
        fontSize: 4,
        lineHeight: 3.5,
        rotation: 0,
        offset: {
            x: 0,
            y: -3.25,
        }
    }
    addTextBox(page, locationText, basisX, basisY, locationLayout)

    const dateText = observation.date ?? ''
    const dateLayout = {
        x: 0.005 * PostScriptPointsPerInch,
        y: 0.08 * PostScriptPointsPerInch,
        width: 0.46 * PostScriptPointsPerInch,
        height: 0.07 * PostScriptPointsPerInch,
        font: fonts.gillSansCondensedFont,
        fontSize: 6,
        lineHeight: 5.25,
        rotation: 0,
        offset: {
            x: 0,
            y: -4.5
        },
        fit: true
    }
    addTextBox(page, dateText, basisX, basisY, dateLayout)

    const nameText = observation.name ?? ''
    const nameLayout = {
        x: 0.005 * PostScriptPointsPerInch,
        y: 0.005 * PostScriptPointsPerInch,
        width: 0.335 * PostScriptPointsPerInch,
        height: 0.07 * PostScriptPointsPerInch,
        font: fonts.gillSansFont,
        fontSize: 5,
        lineHeight: 4.375,
        rotation: 0,
        offset: {
            x: 0.25,
            y: -4
        },
        fit: true
    }
    addTextBox(page, nameText, basisX, basisY, nameLayout)

    const methodText = observation.method ?? ''
    const methodLayout = {
        x: 0.36 * PostScriptPointsPerInch,
        y: 0.005 * PostScriptPointsPerInch,
        width: 0.105 * PostScriptPointsPerInch,
        height: 0.07 * PostScriptPointsPerInch,
        font: fonts.gillSansFont,
        fontSize: 5,
        lineHeight: 4.375,
        rotation: 0,
        offset: {
            x: 0,
            y: -4
        },
        fit: true
    }
    addTextBox(page, methodText, basisX, basisY, methodLayout)

    const numberText = observation.number ?? ''
    const numberLayout = {
        x: 0.661 * PostScriptPointsPerInch,
        y: 0.005 * PostScriptPointsPerInch,
        width: labelHeight - 0.01 * PostScriptPointsPerInch,
        height: 0.07 * PostScriptPointsPerInch,
        font: fonts.gillSansFont,
        fontSize: 6,
        lineHeight: 5.25,
        rotation: 90,
        offset: {
            x: -0.5,
            y: -5,
        }
    }
    addTextBox(page, numberText, basisX, basisY, numberLayout)

    const dataMatrixLayout = {
        x: 0.476 * PostScriptPointsPerInch,
        y: 0.005 * PostScriptPointsPerInch,
        width: 0.11 * PostScriptPointsPerInch,
        height: labelHeight - 0.01 * PostScriptPointsPerInch
    }
    await addDataMatrix(page, numberText, basisX, basisY, dataMatrixLayout)
}

async function writePDFPage(doc, observations, updateLabelsProgress) {
    const page = doc.addPage(PageSizes.Letter)

    doc.registerFontkit(fontkit)
    const gillSansData = await getFontData('fonts/Gill Sans MT.ttf')
    const gillSansCondensedData = await getFontData('fonts/Gill Sans MT Condensed.ttf')
    const gillSansFont = await doc.embedFont(gillSansData)
    const gillSansCondensedFont = await doc.embedFont(gillSansCondensedData)

    for (let i = 0; i < observations.length; i++) {
        const currentRow = nRows - Math.floor(i / nColumns) - 1
        const currentColumn = i % nColumns

        const basisX = horizontalMargin + (currentColumn * (labelWidth + horizontalSpacing))
        const basisY = verticalMargin + (currentRow * (labelHeight + verticalSpacing))

        await addLabel(page, observations[i], basisX, basisY, { gillSansFont, gillSansCondensedFont })
        updateLabelsProgress(i)
    }
}

async function main() {
    try {
        const connection = await amqp.connect(rabbitmqURL)
        const labelsChannel = await connection.createChannel()
        await labelsChannel.assertQueue(labelsQueueName)

        console.log(`Consuming queue '${labelsQueueName}'...`)
        labelsChannel.consume(labelsQueueName, async (msg) => {
            if (msg) {
                const taskId = msg.content.toString()
                const task = await getTaskById(taskId)

                console.log(`Processing task ${taskId}...`)
                await updateTaskInProgress(taskId, { currentStep: 'Generating labels from provided dataset' })
                console.log('\tGenerating labels from provided dataset...')

                const observations = readObservationsFile('./api/data' + task.dataset.replace('/api', '')) // task.dataset has a '/api' suffix, which should be removed

                const warnings = []
                formatObservations(observations, (index) => {
                    warnings.push(index)
                })
                if (warnings.length > 0) {
                    const warningMessage = `Potentially incompatible data found in the following rows (0-indexed): [ ${warnings.join(', ')} ]`
                    await updateTaskWarning(taskId, { message: warningMessage })
                }

                const partitionSize = nRows * nColumns
                const nPartitions = Math.floor(observations.length / partitionSize) + 1
                let partitionStart = 0
                let partitionEnd = Math.min(partitionSize, observations.length)
                let currentPage = 1

                const resultFileName = `${Crypto.randomUUID()}.pdf`
                const doc = await PDFDocument.create()
                for (let i = 0; i < nPartitions; i++) {
                    await writePDFPage(doc, observations.slice(partitionStart, partitionEnd), async (labelsFinished) => {
                        const percentage = `${(100 * (i * partitionSize + labelsFinished) / observations.length).toFixed(2)}%`
                        await updateTaskInProgress(taskId, { currentStep: 'Generating labels from provided dataset', percentage })
                    })

                    partitionStart = partitionEnd
                    partitionEnd = Math.min(partitionEnd + partitionSize, observations.length)
                    currentPage++
                }
                const docBuffer = await doc.save()
                fs.writeFileSync(`./api/data/labels/${resultFileName}`, docBuffer)

                await updateTaskResult(taskId, { uri: `/api/labels/${resultFileName}`, fileName: resultFileName })
                console.log('Completed task', taskId)

                limitFilesInDirectory('./api/data/labels', MAX_LABELS)
                clearTasksWithoutFiles()

                labelsChannel.ack(msg)
            }
        })
    } catch (err) {
        // console.error(err)
        throw err
    }
}

connectToDb().then(() => {
    connectToS3()
    main()
})