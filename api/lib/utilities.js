import fs from 'fs'
import path from 'path'
import AdmZip from 'adm-zip'
import Crypto from 'node:crypto'
import { parse as parseAsync } from 'csv-parse'
import { stringify as stringifyAsync } from 'csv-stringify'

const occurrenceHeader = [
    'errorFlags',
    'dateLabelPrint',
    'fieldNumber',
    'catalogNumber',
    'occurrenceID',
    'userId',
    'userLogin',
    'firstName',
    'firstNameInitial',
    'lastName',
    'recordedBy',
    'sampleId',
    'specimenId',
    'day',
    'month',
    'year',
    'verbatimEventDate',
    'day2',
    'month2',
    'year2',
    'startDayofYear',
    'endDayofYear',
    'country',
    'stateProvince',
    'county',
    'locality',
    'verbatimElevation',
    'decimalLatitude',
    'decimalLongitude',
    'coordinateUncertaintyInMeters',
    'samplingProtocol',
    'resourceRelationship',
    'resourceID',
    'relatedResourceID',
    'relationshipRemarks',
    'phylumPlant',
    'orderPlant',
    'familyPlant',
    'genusPlant',
    'speciesPlant',
    'taxonRankPlant',
    'url',
    'phylum',
    'class',
    'order',
    'family',
    'genus',
    'subgenus',
    'specificEpithet',
    'taxonomicNotes',
    'scientificName',
    'sex',
    'caste',
    'taxonRank',
    'identifiedBy',
    'familyVolDet',
    'genusVolDet',
    'speciesVolDet',
    'sexVolDet',
    'casteVolDet'
]

/*
 * clearDirectory()
 * Deletes all files in a given directory, but not the directory itself (non-recursive)
 */
function clearDirectory(directory) {
    try {
        // Read the list of files in the given directory
        let files = fs.readdirSync(directory)

        // 'rm' each file
        for (const file of files) {
            fs.rmSync(path.join(directory, file))
        }
    } catch (error) {
        console.log('Error while clearing directory:', error)
    }
}

/*
 * compressFile()
 * Compresses a given file to a zip file
 */
function compressFile(filePath) {
    const zipName = filePath.replace(/\.[a-zA-Z]+\b/, '.zip')
    const zip = new AdmZip()

    zip.addLocalFile(filePath)
    zip.writeZip(zipName)
}

/*
 * limitFilesInDirectory()
 * Limits the number of files in a given directory to a given number; deletes the least recently edited file if over the limit
 */
function limitFilesInDirectory(directory, maxFiles) {
    try {
        // Read the list of files in the given directory
        let files = fs.readdirSync(directory).filter((f) => !f.toLowerCase().endsWith('.zip'))

        // Delete the least recently edited file while over the limit
        while (files.length > maxFiles) {
            // Use 'stat' to find when the file was last edited
            // Filter to only files (not directories)
            // And find the least recently edited file
            const oldestFile = files
                .map((f) => ({ name: f, path: path.join(directory, f), stat: fs.statSync(path.join(directory, f)) }))
                .filter((f) => f.stat.isFile())
                .reduce((oldest, current) => current.stat.mtimeMs < oldest.stat.mtimeMs ? current : oldest)
            
            // Archive and then 'rm' the least recently edited file
            compressFile(oldestFile.path)
            fs.rmSync(oldestFile.path)
            // Reread the list of files in the directory
            files = fs.readdirSync(directory).filter((f) => !f.toLowerCase().endsWith('.zip'))
        }
    } catch (error) {
        console.log('Error while limiting files in directory:', error)
    }
}

/*
 * isRowEmpty()
 * A boolean function that returns whether a row has all blank entries
 */
function isRowEmpty(row) {
    for (const field of Object.keys(row)) {
        if (!!row[field] && !!row[field]) {
            return false
        }
    }
    return true
}

/*
 * delay()
 * Returns a Promise that resolves after a given number of milliseconds
 */
function delay(mSec) {
    return new Promise(resolve => setTimeout(resolve, mSec))
}

/*
 * clearBlankRows()
 * Deletes blank rows from a CSV at a given file path
 */
async function clearBlankRows(filePath) {
    // Check that the input file path exists
    if (!fs.existsSync(filePath)) {
        throw new Error(`File does not exist: ${filePath}`)
    }

    // Create an input CSV parser and an output stringifier for a temporary file
    const inputFileStream = fs.createReadStream(filePath, { encoding: 'utf-8' })
    const parser = inputFileStream.pipe(parseAsync({ columns: true, skip_empty_lines: true, relax_quotes: true, trim: true }))

    const tempFilePath = `./api/data/temp/${Crypto.randomUUID()}.csv`
    const outputFileStream = fs.createWriteStream(tempFilePath, { encoding: 'utf-8' })
    const stringifier = stringifyAsync({ header: true, columns: occurrenceHeader })
    stringifier.pipe(outputFileStream)

    // Add each non-empty row from the input file to the temporary output file
    for await (const row of parser) {
        if (isRowEmpty(row)) continue

        // Create a function that guarantees write completion before continuing
        const writeAsync = (stringifier, data) => new Promise((resolve, reject) => {
            stringifier.write(data, (error) => {
                if (error) reject(error)
                else resolve()
            })
        })

        await writeAsync(stringifier, row)
    }

    // Destroy the input and output streams
    stringifier.end()
    parser.destroy()

    // Wait a second for file permissions to release
    await delay(1000)

    // Move the temporary output file to the input file path (overwrites the original file and renames the temporary file)
    fs.renameSync(tempFilePath, filePath)
}

export { clearDirectory, limitFilesInDirectory, clearBlankRows }