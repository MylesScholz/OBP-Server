import fs from 'fs'
import { PageSizes, PDFDocument, degrees } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import { datamatrixrectangularextension } from 'bwip-js/node'

import TaskService from '../services/TaskService.js'
import OccurrenceService from '../services/OccurrenceService.js'
import FileManager from '../utils/FileManager.js'
import { abbreviations, fieldNames, fileLimits, requiredFields } from '../utils/constants.js'

/* Constants */

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
 * createLabelFromOccurrence()
 * Creates an object containing formatted label fields from a given occurrence object
 */
function createLabelFromOccurrence(occurrence) {
    // Roman numerals 1 to 12 (for date formatting)
    const monthNumerals = [ 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII' ]

    const label = {}

    // Location field
    const country = occurrence[fieldNames.country]
    const stateProvince = occurrence[fieldNames.stateProvince]
    let formattedCounty = abbreviations.counties[occurrence[fieldNames.county].trim()] ?? occurrence[fieldNames.county].trim()
    formattedCounty = formattedCounty ? `:${formattedCounty}${country === 'USA' ? 'Co' : ''}` : ''
    const locality = occurrence[fieldNames.locality]
    const locationText = `${country}:${stateProvince}${formattedCounty} ${locality}`
    label.location = locationText

    // Coordinates field
    const latitude = parseFloat(occurrence[fieldNames.latitude]).toFixed(3).toString()
    const longitude = parseFloat(occurrence[fieldNames.longitude]).toFixed(3).toString()
    const elevation = occurrence[fieldNames.elevation] ? ` ${occurrence[fieldNames.elevation]}m` : ''
    const coordinatesText = `${latitude} ${longitude}${elevation}`
    label.coordinates = coordinatesText

    // Date field
    const day1 = occurrence[fieldNames.day]
    const month1 = monthNumerals[occurrence[fieldNames.month] - 1]
    const year = occurrence[fieldNames.year]
    // Optional second date (for trap observations)
    const day2 = occurrence[fieldNames.day2]
    const month2 = monthNumerals[occurrence[fieldNames.month2] - 1]
    const duration = `-${day2}.${month2}`
    // Sample and specimen IDs
    const sampleID = occurrence[fieldNames.sampleId].replace('-', '')
    const specimenID = occurrence[fieldNames.specimenId]
    const dateText = `${day1}.${month1}${(day2 && month2) ? duration : ''}${year}-${sampleID}.${specimenID}`
    label.date = dateText

    // Collector field
    const firstNameInitial = occurrence[fieldNames.firstNameInitial]
    const lastName = occurrence[fieldNames.lastName]
    const nameText = `${firstNameInitial}${lastName}`
    label.name = nameText

    // Collection method field
    let methodText = occurrence[fieldNames.samplingProtocol].toLowerCase() ?? ''
    if (methodText.includes('net')) { methodText = 'net' }
    if (methodText.includes('trap')) { methodText = 'trap' }
    if (methodText.includes('nest')) { methodText = 'nest' }
    label.method = methodText

    // Field number field
    const numberText = occurrence[fieldNames.fieldNumber]
    label.number = numberText

    return label
}

/*
 * createLabelsFromOccurrences()
 * Formats the given occurrences into label fields and updates warnings
 */
function createLabelsFromOccurrences(occurrences, addWarning) {
    if (!occurrences) return

    // Optional fields that should throw warnings
    const warningFields = [
        fieldNames.county
    ]

    const labels = []
    for (const occurrence of occurrences) {
        const label = createLabelFromOccurrence(occurrence)
        labels.push(label)

        // Add warnings for falsy warningFields and fields that are too long (highly specific, may need tuning)
        const warningReasons = warningFields.filter((field) => !occurrence[field])
        if (occurrence[fieldNames.country].length > 3 ||
            occurrence[fieldNames.stateProvince].length > 2 ||
            occurrence[fieldNames.county].length + occurrence[fieldNames.locality].length > 25 ||
            label.name.length > 19 ||
            label.method.length > 5
        ) {
            warningReasons.push('field length')
        }
        if (warningReasons.length > 0) {
            addWarning(occurrence[fieldNames.fieldNumber], warningReasons.join(', '))
        }
    }

    return labels
}

/*
 * partitionLabels()
 * Inserts blank records between labels with different collectors for spacing
 */
function partitionLabels(labels) {
    if (!labels) return

    const partitionedLabels = []

    // Iterate through each label and look ahead one to determine if the collectors are different
    for (let i = 0; i < labels.length - 1; i++) {
        partitionedLabels.push(labels[i])

        if (labels[i].name !== labels[i + 1].name) {
            partitionedLabels.push({ blank: true })
        }
    }

    return partitionedLabels
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
            lineHeight = fontSize

            // Recalculate the approximate height and width of the text for the new font size
            singleLineWidth = textBoxLayout.font.widthOfTextAtSize(text, fontSize)
            approximateNumberOfLines = text.match(/ /g) ? Math.ceil(singleLineWidth / textBoxLayout.width) : 1
            singleLineHeight = textBoxLayout.font.heightAtSize(fontSize, { descender: true })
            approximateHeight = approximateNumberOfLines * singleLineHeight

            // Adjust the text offset to prevent text overflow
            yOffset = (textBoxLayout.height - approximateHeight) * -0.5 - singleLineHeight * 0.8
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
 * addLabel()
 * Adds a label for the given label data to the PDFPage at the given position
 */
async function addLabel(page, label, basisX, basisY, fonts) {
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
    const locationText = label.location ?? ''
    const locationLayout = {
        x: 0.005 * PostScriptPointsPerInch,
        y: 0.18525 * PostScriptPointsPerInch,
        width: 0.46 * PostScriptPointsPerInch,
        height: 0.12075 * PostScriptPointsPerInch,
        font: fonts.oxygenMonoFont,
        fontSize: 3,
        lineHeight: 3,
        rotation: 0,
        offset: {
            x: 0,
            y: -2.3,
        }
    }
    // Add the location field to the page
    addTextBox(page, locationText, basisX, basisY, locationLayout)

    // Define the layout for the coordinates label field
    const coordinatesText = label.coordinates ?? ''
    const coordinatesLayout = {
        x: 0.005 * PostScriptPointsPerInch,
        y: 0.145 * PostScriptPointsPerInch,
        width: 0.46 * PostScriptPointsPerInch,
        height: 0.04025 * PostScriptPointsPerInch,
        font: fonts.oxygenMonoFont,
        fontSize: 3,
        lineHeight: 3,
        rotation: 0,
        offset: {
            x: 0,
            y: -2.3,
        },
        fit: true
    }
    // Add the coordinates field to the page
    addTextBox(page, coordinatesText, basisX, basisY, coordinatesLayout)

    // Define the layout for the date label field
    const dateText = label.date ?? ''
    const dateLayout = {
        x: 0.005 * PostScriptPointsPerInch,
        y: 0.075 * PostScriptPointsPerInch,
        width: 0.46 * PostScriptPointsPerInch,
        height: 0.07 * PostScriptPointsPerInch,
        font: fonts.oxygenMonoFont,
        fontSize: 5,
        lineHeight: 5,
        rotation: 0,
        offset: {
            x: 0,
            y: -0.056 * PostScriptPointsPerInch
        },
        fit: true
    }
    // Add the date field to the page
    addTextBox(page, dateText, basisX, basisY, dateLayout)

    // Define the layout for the collector name label field
    const nameText = label.name ?? ''
    const nameLayout = {
        x: 0.005 * PostScriptPointsPerInch,
        y: 0.005 * PostScriptPointsPerInch,
        width: 0.335 * PostScriptPointsPerInch,
        height: 0.07 * PostScriptPointsPerInch,
        font: fonts.oxygenMonoFont,
        fontSize: 5,
        lineHeight: 5,
        rotation: 0,
        offset: {
            x: 0,
            y: -0.056 * PostScriptPointsPerInch
        },
        fit: true
    }
    // Add the collector name field to the page
    addTextBox(page, nameText, basisX, basisY, nameLayout)

    // Define the layout for the collection method label field
    const methodText = label.method ?? ''
    const methodLayout = {
        x: 0.36 * PostScriptPointsPerInch,
        y: 0.005 * PostScriptPointsPerInch,
        width: 0.105 * PostScriptPointsPerInch,
        height: 0.07 * PostScriptPointsPerInch,
        font: fonts.oxygenMonoFont,
        fontSize: 5,
        lineHeight: 5,
        rotation: 0,
        offset: {
            x: 0,
            y: -0.056 * PostScriptPointsPerInch
        },
        fit: true
    }
    // Add the collection method field to the page
    addTextBox(page, methodText, basisX, basisY, methodLayout)

    // Define the layout for the field number label field
    const numberText = label.number ?? ''
    const numberLayout = {
        x: 0.661 * PostScriptPointsPerInch,
        y: 0.005 * PostScriptPointsPerInch,
        width: labelHeight - 0.01 * PostScriptPointsPerInch,
        height: 0.07 * PostScriptPointsPerInch,
        font: fonts.oxygenMonoFont,
        fontSize: 4.5,
        lineHeight: 4.5,
        rotation: 90,
        offset: {
            x: -0.75,
            y: -5,
        }
    }
    // Add the field number field to the page
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
 * getFontData()
 * Reads a given font file from the local disk
 */
async function getFontData(fileKey) {
    const filePath = './api/data/' + fileKey

    return fs.readFileSync(filePath)
}

/*
 * writePDFPage()
 * Creates a PDFPage in the given PDFDocument and populates it with labels
 */
async function writePDFPage(doc, labels, updateProgress) {
    await updateProgress(0)

    // Create the PDFPage
    const page = doc.addPage(PageSizes.Letter)

    // Register and embed the fonts
    doc.registerFontkit(fontkit)
    const oxygenMonoData = await getFontData('fonts/OxygenMono-Regular.ttf')
    const oxygenMonoFont = await doc.embedFont(oxygenMonoData)

    // Add a label for each formatted occurrence in rows and columns
    for (let i = 0; i < labels.length; i++) {
        // Skip blank partition records
        if (labels[i].blank) {
            continue
        }

        // Calculate the current row and column
        const currentRow = nRows - Math.floor(i / nColumns) - 1
        const currentColumn = i % nColumns

        // Calculate the position of the current label (lower left corner)
        const basisX = horizontalMargin + (currentColumn * (labelWidth + horizontalSpacing))
        const basisY = verticalMargin + (currentRow * (labelHeight + verticalSpacing))

        // Add the label
        await addLabel(page, labels[i], basisX, basisY, { oxygenMonoFont })

        // Provide a progress update
        updateProgress(100 * i / labels.length)
    }
}

async function writePDF(filePath, labels, updateProgress) {
    // Paginate the data
    const pageSize = nRows * nColumns
    const totalPages = Math.ceil(labels.length / pageSize)
    let pageStart = 0
    let pageEnd = Math.min(pageSize, labels.length)
    let currentPage = 1

    // Create the output PDF
    const doc = await PDFDocument.create()
    
    // Add pages of labels
    for (let i = 0; i < totalPages; i++) {
        await writePDFPage(doc, labels.slice(pageStart, pageEnd), async (percentage) => {
            await updateProgress((100 * i + percentage) / totalPages)
        })

        // Update the partition markers
        pageStart = pageEnd
        pageEnd = Math.min(pageEnd + pageSize, labels.length)
        currentPage++
    }

    // Write the document to the given file path
    const docBuffer = await doc.save()
    fs.writeFileSync(filePath, docBuffer)
}

export default async function processLabelsTask(task) {
    if (!task) { return }

    const taskId = task._id

    // Input and output file names
    const uploadFilePath = './api/data' + task.dataset.replace('/api', '')      // task.dataset has a '/api' suffix, which should be removed
    const labelsFileName = `labels_${task.tag}.pdf`
    const labelFilePath = `./api/data/labels/${labelsFileName}`

    await TaskService.logTaskStep(taskId, 'Formatting and uploading provided dataset')

    // Delete old occurrences (from previous tasks)
    await OccurrenceService.deleteOccurrences()

    // Read data from the input occurrence file and insert it into the occurrences database table
    const { duplicates: duplicateOccurrences } = await OccurrenceService.createOccurrencesFromFile(uploadFilePath)

    // Find the set of printable occurrences
    const printableOccurrences = await OccurrenceService.getPrintableOccurrences(requiredFields)

    // Calculate the number of unprintable occurrences that were filtered out and add a warning message
    const totalInputOccurrences = await OccurrenceService.count() + duplicateOccurrences.length
    const numFilteredOut = totalInputOccurrences - printableOccurrences.length

    const warnings = [`Filtered out ${numFilteredOut} occurrences that were already printed or had faulty data.`]

    // Filter and process the occurrences into formatted label fields and check the data for warnings
    let warningIds = []
    const labels = createLabelsFromOccurrences(printableOccurrences, (warningId, reason) => {
        warningIds.push(`${warningId}${reason ? ` (${reason})` : ''}`)
    })
    warnings.push(`Potentially incompatible data for occurrences: [ ${warningIds.join(', ')} ]`)

    // Display warnings, if any
    await TaskService.updateWarningsById(taskId, warnings)

    // Add blank partitions to labels for spacing
    const partitionedLabels = partitionLabels(labels)

    await TaskService.logTaskStep(taskId, 'Generating labels from provided dataset')

    // Write the labels PDF
    await writePDF(labelFilePath, partitionedLabels, async (percentage) => {
        await TaskService.updateProgressPercentageById(taskId, percentage)
    })

    // Update the task result with the output files
    await TaskService.updateResultById(taskId, {
        outputs: [
            { uri: `/api/labels/${labelsFileName}`, fileName: labelsFileName, type: 'labels' }
        ]
    })

    // Archive excess output files
    FileManager.limitFilesInDirectory('./api/data/labels', fileLimits.maxLabels)
    // Clean up tasks
    await TaskService.deleteTasksWithoutFiles()
}