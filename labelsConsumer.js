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
import { limitFilesInDirectory } from './api/lib/utilities.js'

/* Constants */

// RabbitMQ connection URL
const rabbitmqHost = process.env.RABBITMQ_HOST || 'localhost'
const rabbitmqURL = `amqp://${rabbitmqHost}`

// Maximum number of output files stored on the server
const MAX_LABELS = 10

// Data field names
const OBSERVATION_NO = 'Observation No.'
const FIRST_INITIAL = 'Collector - First Initial'
const LAST_NAME = 'Collector - Last Name'
const SAMPLE_ID = 'Sample ID'
const SPECIMEN_ID = 'Specimen ID'
const OBA_DAY_1 = 'Collection Day 1'
const OBA_MONTH_1 = 'Month 1'
const OBA_YEAR = 'Year 1'
const OBA_DAY_2 = 'Collection Day 2'
const OBA_MONTH_2 = 'Month 2'
const OBA_COUNTRY = 'Country'
const OBA_STATE = 'State'
const OBA_COUNTY = 'County'
const OBA_ABBR_LOCATION = 'Abbreviated Location'
const OBA_LATITUDE = 'Dec. Lat.'
const OBA_LONGITUDE = 'Dec. Long.'
const ELEVATION = 'Elevation'
const COLLECTION_METHOD = 'Collection method'

// List of mandatory fields for a label to be printed
const requiredFields = [
    OBSERVATION_NO,
    FIRST_INITIAL,
    LAST_NAME,
    SAMPLE_ID,
    SPECIMEN_ID,
    OBA_DAY_1,
    OBA_MONTH_1,
    OBA_YEAR,
    OBA_COUNTRY,
    OBA_STATE,
    OBA_ABBR_LOCATION,
    OBA_LATITUDE,
    OBA_LONGITUDE,
    COLLECTION_METHOD
]

// Number of rows of labels
const nRows = 25
// Number of columns of labels
const nColumns = 10

// Conversion rate from PostScript points (the standard unit of pdf-lib) to inches
const PostScriptPointsPerInch = 72

// Paper dimensions in PostScript points
const letterPaperWidth = 8.5 * PostScriptPointsPerInch
const letterPaperHeight = 11 * PostScriptPointsPerInch

// Paper margins in PostScript points
const horizontalMargin = 0.25 * PostScriptPointsPerInch
const verticalMargin = 0.5 * PostScriptPointsPerInch

// Label dimensions in PostScript points
const labelWidth = 0.666 * PostScriptPointsPerInch
const labelHeight = 0.311 * PostScriptPointsPerInch

// Horizontal and vertical spacing between labels in PostScript points
// Calculated as an even distribution of the paper space after subtracting the margins and label dimensions
const horizontalSpacing = (letterPaperWidth - (2 * horizontalMargin) - (nColumns * labelWidth)) / (nColumns - 1)
const verticalSpacing = (letterPaperHeight - (2 * verticalMargin) - (nRows * labelHeight)) / (nRows - 1)

/*
 * readObservationsFile()
 * Parses an input observations CSV file into a list of objects
 */
function readObservationsFile(filePath) {
    const observationsBuffer = fs.readFileSync(filePath)
    const observations = parse(observationsBuffer, { columns: true })

    return observations
}

/*
 * formatObservation()
 * Creates an object containing formatted label fields from a given observation object
 */
function formatObservation(observation) {
    const formattedObservation = {}

    // Location field
    const country = observation[OBA_COUNTRY]
    const stateProvince = observation[OBA_STATE]
    const county = observation[OBA_COUNTY] ? `:${observation[OBA_COUNTY]}Co` : ''
    const place = observation[OBA_ABBR_LOCATION]
    const latitude = observation[OBA_LATITUDE]
    const longitude = observation[OBA_LONGITUDE]
    const elevation = observation[ELEVATION] ? ` ${observation[ELEVATION]}m` : ''
    const locationText = `${country}:${stateProvince}${county} ${place} ${latitude} ${longitude}${elevation}`
    formattedObservation.location = locationText

    // Date field
    const day1 = observation[OBA_DAY_1]
    const month1 = observation[OBA_MONTH_1]
    const year = observation[OBA_YEAR]
    // Optional second date (for trap observations)
    const day2 = observation[OBA_DAY_2]
    const month2 = observation[OBA_MONTH_2]
    const duration = `-${day2}.${month2}`
    // Sample and specimen IDs
    const sampleID = observation[SAMPLE_ID]
    const specimenID = observation[SPECIMEN_ID]
    const dateText = `${day1}.${month1}${(day2 && month2) ? duration : ''}${year}-${sampleID}.${specimenID}`
    formattedObservation.date = dateText

    // Collector field
    const firstInitial = observation[FIRST_INITIAL]
    const lastName = observation[LAST_NAME]
    const nameText = `${firstInitial}${lastName}`
    formattedObservation.name = nameText

    // Collection method field
    const methodText = observation[COLLECTION_METHOD]
    formattedObservation.method = methodText

    // Observation number field
    const numberText = observation[OBSERVATION_NO]
    formattedObservation.number = numberText

    return formattedObservation
}

/*
 * formatObservations()
 * Filters, formats, and adds warnings for a given list of observations
 */
function formatObservations(observations, addWarningID) {
    // Optional fields that should throw warnings
    const warningFields = [
        OBA_COUNTY,
        ELEVATION
    ]

    // Filter out observations that have any falsy requiredFields
    const formattedObservations = observations.filter((observation) => !requiredFields.some((field) => !observation[field]))

    // Format and add warnings to the remaining observations
    for (let i = 0; i < formattedObservations.length; i++) {
        const observation = formattedObservations[i]
        const formattedObservation = formatObservation(observation)

        // Add warnings for falsy warningFields and fields that are too long (highly specific, may need tuning)
        if (
            warningFields.some((field) => !observation[field]) ||
            observation[OBA_COUNTRY].length > 3 ||
            observation[OBA_STATE].length > 2 ||
            observation[OBA_COUNTY].length > 15 ||
            observation[OBA_ABBR_LOCATION].length > 22 ||
            observation[OBA_LATITUDE].length > 8 ||
            observation[OBA_LONGITUDE].length > 8 ||
            observation[ELEVATION].length > 5 ||
            formattedObservation.location.length > 72 ||
            formattedObservation.date.length > 30 ||
            formattedObservation.name.length > 20 ||
            observation[COLLECTION_METHOD].length > 15
        ) {
            addWarningID(observation[OBSERVATION_NO])
        }

        formattedObservations[i] = formattedObservation
    }

    return formattedObservations
}

/*
 * addTextBox()
 * Adds a text box to the given PDFPage with the given specifications
 * 1.    text: The text to include in the text box
 * 2, 3. basisX, basisY: Coordinates (in PostScript points) of the lower left corner of the box
 * 4.    textBoxLayout: An object containing text formatting information
 */
function addTextBox(page, text, basisX, basisY, textBoxLayout) {
    // An optional bounding rectangle for making adjustments to the layout
    // page.drawRectangle({
    //     x: basisX + textBoxLayout.x,
    //     y: basisY + textBoxLayout.y,
    //     width: textBoxLayout.width,
    //     height: textBoxLayout.height,
    //     rotate: degrees(textBoxLayout.rotation),
    //     borderWidth: 0.1,
    //     opacity: 0
    // })

    // Handle automatic text fitting
    let fontSize = textBoxLayout.fontSize
    let lineHeight = textBoxLayout.lineHeight
    let yOffset = textBoxLayout.offset.y
    if (textBoxLayout.fit) {
        // The width (in PostScript points) of the text at fontSize with no line wrapping
        let singleLineWidth = textBoxLayout.font.widthOfTextAtSize(text, fontSize)
        // Guess the number of lines the text will wrap to when constrained to textBoxLayout.width
        const spaces = text.match(/ /g)?.length || 0
        let approximateNumberOfLines = Math.min(spaces + 1, Math.ceil(singleLineWidth / textBoxLayout.width))
        // The height (in PostScript points) of a single line of text at fontSize
        let singleLineHeight = textBoxLayout.font.heightAtSize(fontSize, { descender: true })
        // The approximate height of the text with wrapping
        let approximateHeight = approximateNumberOfLines * singleLineHeight

        // If the text is a single line, reduce the font size to fit the text box width
        // Otherwise, fit the text box height
        // Keep the font size at least 1 PostScript point
        while (
            (approximateNumberOfLines === 1 && singleLineWidth > textBoxLayout.width) ||
            (approximateNumberOfLines > 1 && approximateHeight > textBoxLayout.height) &&
            fontSize > 1
        ) {
            // Decrement the font size
            fontSize -= 0.01
            // For the Gill Sans font, the line height should be ~85% of the font size
            lineHeight = 0.85 * fontSize

            // Recalculate the approximate height and width of the text for the new font size
            singleLineWidth = textBoxLayout.font.widthOfTextAtSize(text, fontSize)
            approximateNumberOfLines = text.match(/ /g) ? Math.ceil(singleLineWidth / textBoxLayout.width) : 1
            singleLineHeight = textBoxLayout.font.heightAtSize(fontSize, { descender: true })
            approximateHeight = approximateNumberOfLines * singleLineHeight

            // Adjust the text offset to prevent text overflow
            yOffset = approximateHeight - (0.8 * singleLineHeight) - textBoxLayout.height
        }
    }

    // Add the text box to the page
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

/*
 * addDataMatrix()
 * Adds a 8x18 data matrix bar code to the given PDFPage with the given specifications
 * 1.    text: The text to encode in the data matrix
 * 2, 3. basisX, basisY: Coordinates (in PostScript points) of the lower left corner of the box
 * 4.    dataMatrixLayout: An object containing dimension and position data
 */
async function addDataMatrix(page, text, basisX, basisY, dataMatrixLayout) {
    // An optional bounding rectangle for making adjustments to the layout
    // page.drawRectangle({
    //     x: basisX + dataMatrixLayout.x,
    //     y: basisY + dataMatrixLayout.y,
    //     width: dataMatrixLayout.width,
    //     height: dataMatrixLayout.height,
    //     borderWidth: 0.1,
    //     opacity: 0
    // })
    
    // Create the data matrix PNG from the text
    const png = await datamatrixrectangularextension({
        text: text,
        version: '8x18',
        rotate: 'L'
    })
    // Embed the image
    const image = await page.doc.embedPng(png)
    // Scale the image to the given dimensions
    const scaledDimensions = image.scaleToFit(dataMatrixLayout.width, dataMatrixLayout.height)
    // Add the image at the given position
    page.drawImage(image, {
        x: basisX + dataMatrixLayout.x,
        y: basisY + dataMatrixLayout.y,
        width: scaledDimensions.width,
        height: scaledDimensions.height
    })
}

/*
 * getFontData()
 * Reads a given font file from the local disk
 */
async function getFontData(fileKey) {
    const filePath = './api/data/' + fileKey

    return fs.readFileSync(filePath)
}

/*
 * addLabel()
 * Adds a label for the given formatted observation to the PDFPage at the given position
 */
async function addLabel(page, observation, basisX, basisY, fonts) {
    // An optional bounding rectangle for making adjustments to the layout
    // page.drawRectangle({
    //     x: basisX,
    //     y: basisY,
    //     width: labelWidth,
    //     height: labelHeight,
    //     borderWidth: 0.1,
    //     opacity: 0
    // })

    // Define the layout for the location label field
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
    // Add the location field to the page
    addTextBox(page, locationText, basisX, basisY, locationLayout)

    // Define the layout for the date label field
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
    // Add the date field to the page
    addTextBox(page, dateText, basisX, basisY, dateLayout)

    // Define the layout for the collector name label field
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
    // Add the collector name field to the page
    addTextBox(page, nameText, basisX, basisY, nameLayout)

    // Define the layout for the collection method label field
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
    // Add the collection method field to the page
    addTextBox(page, methodText, basisX, basisY, methodLayout)

    // Define the layout for the observation number label field
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
    // Add the observation number field to the page
    addTextBox(page, numberText, basisX, basisY, numberLayout)

    // Define the layout for the data matrix
    const dataMatrixLayout = {
        x: 0.476 * PostScriptPointsPerInch,
        y: 0.005 * PostScriptPointsPerInch,
        width: 0.11 * PostScriptPointsPerInch,
        height: labelHeight - 0.01 * PostScriptPointsPerInch
    }
    // Add the data matrix to the page
    await addDataMatrix(page, numberText, basisX, basisY, dataMatrixLayout)
}

/*
 * writePDFPage()
 * Creates a PDFPage in the given PDFDocument and populates it with labels from the given list of formatted observations
 */
async function writePDFPage(doc, observations, updateLabelsProgress) {
    // Create the PDFPage
    const page = doc.addPage(PageSizes.Letter)

    // Register and embed the fonts
    doc.registerFontkit(fontkit)
    const gillSansData = await getFontData('fonts/Gill Sans MT.ttf')
    const gillSansCondensedData = await getFontData('fonts/Gill Sans MT Condensed.ttf')
    const gillSansFont = await doc.embedFont(gillSansData)
    const gillSansCondensedFont = await doc.embedFont(gillSansCondensedData)

    // Add a label for each formatted observation in rows and columns
    for (let i = 0; i < observations.length; i++) {
        // Calculate the current row and column
        const currentRow = nRows - Math.floor(i / nColumns) - 1
        const currentColumn = i % nColumns

        // Calculate the position of the current label (lower left corner)
        const basisX = horizontalMargin + (currentColumn * (labelWidth + horizontalSpacing))
        const basisY = verticalMargin + (currentRow * (labelHeight + verticalSpacing))

        // Add the label
        await addLabel(page, observations[i], basisX, basisY, { gillSansFont, gillSansCondensedFont })

        // Provide a progress update
        updateLabelsProgress(i)
    }
}

/*
 * main()
 * Listens for tasks on a RabbitMQ queue; creates a PDF document of labels from a formatted CSV file of observation data
 */
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

                // Filter and process the observations into formatted label fields and check the data for warnings
                const warnings = []
                const formattedObservations = formatObservations(observations, (warningId) => {
                    warnings.push(warningId)
                })
                // Send warnings, if any
                if (warnings.length > 0) {
                    const warningMessage = `Potentially incompatible data for observations: [ ${warnings.join(', ')} ]`
                    await updateTaskWarning(taskId, { message: warningMessage })
                }

                // Paginate the data
                const partitionSize = nRows * nColumns
                const nPartitions = Math.floor(formattedObservations.length / partitionSize) + 1
                let partitionStart = 0
                let partitionEnd = Math.min(partitionSize, formattedObservations.length)
                let currentPage = 1

                // Create the output PDF
                const resultFileName = `${Crypto.randomUUID()}.pdf`
                const doc = await PDFDocument.create()
                
                // Add pages of labels
                for (let i = 0; i < nPartitions; i++) {
                    await writePDFPage(doc, formattedObservations.slice(partitionStart, partitionEnd), async (labelsFinished) => {
                        const percentage = `${(100 * (i * partitionSize + labelsFinished) / formattedObservations.length).toFixed(2)}%`
                        await updateTaskInProgress(taskId, { currentStep: 'Generating labels from provided dataset', percentage })
                    })

                    // Update the partition markers
                    partitionStart = partitionEnd
                    partitionEnd = Math.min(partitionEnd + partitionSize, formattedObservations.length)
                    currentPage++
                }

                // Save the document to a file
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
    main()
})