import fs from 'fs'
import { parse as parseAsync } from 'csv-parse'
import { parse as parseSync } from 'csv-parse/sync'
import { stringify as stringifySync } from 'csv-stringify/sync'

import { clearTasksWithoutFiles, updateTaskInProgress, updateTaskResult } from '../models/task.js'
import { limitFilesInDirectory } from './utilities.js'

/* Constants */

// Maximum number of output files stored on the server
const MAX_EMAILS = 25
// Maximum number of observations to read from a file at once
const CHUNK_SIZE = 5000
// Field names
const ERROR_FLAGS = 'errorFlags'
const USER_LOGIN = 'userLogin'
const FULL_NAME = 'fullName'
const FIRST_NAME = 'firstName'
const FIRST_NAME_INITIAL = 'firstNameInitial'
const LAST_NAME = 'lastName'
const EMAIL = 'email'
const ADDRESS = 'address'
const CITY = 'city'
const STATE = 'stateProvince'
const COUNTRY = 'country'
const ZIP_CODE = 'zip'
const LOCALITY = 'locality'
const ACCURACY = 'coordinateUncertaintyInMeters'
const PLANT_PHYLUM = 'phylumPlant'
const PLANT_ORDER = 'orderPlant'
const PLANT_FAMILY = 'familyPlant'
const PLANT_GENUS = 'genusPlant'
const PLANT_SPECIES = 'speciesPlant'
const PLANT_TAXON_RANK = 'taxonRankPlant'
const emailsHeader = [
    'locationEmails',
    'accuracyEmails',
    'taxonomyEmails'
]
const locationErrorFlags = [
    LOCALITY
]
const accuracyErrorFlags = [
    ACCURACY
]
const taxonomyErrorFlags = [
    PLANT_PHYLUM,
    PLANT_ORDER,
    PLANT_FAMILY,
    PLANT_GENUS,
    PLANT_SPECIES,
    PLANT_TAXON_RANK
]

/*
 * readUsernamesFile()
 * Parses /api/data/usernames.csv into a JS object
 */
function readUsernamesFile() {
    // If /api/data/usernames.csv doesn't exist locally, create a base version and save it
    if (!fs.existsSync('./api/data/usernames.csv')) {
        const header = [USER_LOGIN, FULL_NAME, FIRST_NAME, FIRST_NAME_INITIAL, LAST_NAME, EMAIL, ADDRESS, CITY, STATE, COUNTRY, ZIP_CODE]
        const csv = stringifySync([], { header: true, columns: header })
        fs.writeFileSync('./api/data/usernames.csv', csv)
    }
    
    // Read and parse /api/data/usernames.csv
    const usernamesData = fs.readFileSync('./api/data/usernames.csv')
    return parseSync(usernamesData, { columns: true, skip_empty_lines: true, relax_quotes: true })
}

/*
 * readOccurrencesFileChunks()
 * A generator function that reads a given occurrences CSV file into memory in chunks of a given size
 */
async function* readOccurrencesFileChunks(filePath, chunkSize) {
    // Create the read stream and pipe it to a CSV parser
    const fileStream = fs.createReadStream(filePath, { encoding: 'utf-8' })
    const parser = parseAsync({ columns: true, skip_empty_lines: true, relax_quotes: true })
    const csvStream = fileStream.pipe(parser)

    // Create a chunk to store rows
    let chunk = []

    // Read the file, yielding chunks as they are filled
    for await (const row of csvStream) {
        // Add the current row to the chunk
        chunk.push(row)

        // If the chunk is large enough, yield it and reset the chunk for the next call
        if (chunk.length >= chunkSize) {
            yield chunk
            chunk = []
        }
    }

    // Yield any remaining rows (a partial chunk)
    if (chunk.length > 0) {
        yield chunk
    }
}

/*
 * filterUsersByUserLogins()
 * Filters a given list of user data down to rows with USER_LOGIN values that occur in a given set
 */
function filterUsersByUserLogins(users, userErrorMap) {
    const uniqueUserNames = new Set()
    const filteredUsers = []
    for (const user of users) {
        if (user[USER_LOGIN] && userErrorMap.has(user[USER_LOGIN]) && !uniqueUserNames.has(user[FULL_NAME])) {
            uniqueUserNames.add(user[FULL_NAME])
            filteredUsers.push(user)
        }
    }

    return filteredUsers
}

/*
 * writeEmailsFile()
 * Writes user emails divided into error categories to a CSV file at the given file path
 */
function writeEmailsFile(filePath, users, userErrorMap) {
    // Categorize user emails into different lists by error type
    const locationEmails = []
    const accuracyEmails = []
    const taxonomyEmails = []
    for (const user of users) {
        const userErrors = userErrorMap.get(user[USER_LOGIN])

        if (locationErrorFlags.some((field) => userErrors.has(field))) {
            locationEmails.push(user[EMAIL])
        }
        if (accuracyErrorFlags.some((field) => userErrors.has(field))) {
            accuracyEmails.push(user[EMAIL])
        }
        if (taxonomyErrorFlags.some((field) => userErrors.has(field))) {
            taxonomyEmails.push(user[EMAIL])
        }
    }

    // Convert email lists into object rows
    const emailRows = []
    for (let i = 0; i < Math.max(locationEmails.length, accuracyEmails.length, taxonomyEmails.length); i++) {
        const row = {
            'locationEmails': locationEmails[i] ?? '',
            'accuracyEmails': accuracyEmails[i] ?? '',
            'taxonomyEmails': taxonomyEmails[i] ?? ''
        }
        emailRows.push(row)
    }

    const csv = stringifySync(emailRows, { header: true, columns: emailsHeader })
    fs.writeFileSync(filePath, csv)
}

export default async function processEmailsTask(task) {
    if (!task) { return }

    const taskId = task._id

    await updateTaskInProgress(taskId, { currentStep: 'Compiling user email addresses...' })
    console.log('\tCompiling user email addresses...')

    // Read users dataset
    const users = readUsernamesFile()

    // Read occurrences dataset in chunks, keeping a record of unique userLogins found and their associated error flags
    const userErrorMap = new Map()
    const occurrencesFilePath = './api/data' + task.dataset.replace('/api', '') // task.dataset has a '/api' suffix, which should be removed
    for await (const chunk of readOccurrencesFileChunks(occurrencesFilePath, CHUNK_SIZE)) {
        for (const occurrence of chunk) {
            if (occurrence[USER_LOGIN] && occurrence[ERROR_FLAGS]) {
                const userLogin = occurrence[USER_LOGIN]
                const errorFlags = occurrence[ERROR_FLAGS].split(';')

                // Initialize mapping if empty
                if (!userErrorMap.has(userLogin)) {
                    userErrorMap.set(userLogin, new Set())
                }
                
                // Add each unique error flag to the mapping for this user
                for (const errorFlag of errorFlags) {
                    userErrorMap.get(userLogin).add(errorFlag)
                }
            }
        }
    }

    // Filter users down to those with USER_LOGIN values in the provided occurrence dataset
    const filteredUsers = filterUsersByUserLogins(users, userErrorMap)

    const emailsFileName = `emails_${task.tag}.csv`
    const emailsFilePath = './api/data/emails/' + emailsFileName
    writeEmailsFile(emailsFilePath, filteredUsers, userErrorMap)

    await updateTaskResult(taskId, {
        outputs: [
            { uri: `/api/emails/${emailsFileName}`, fileName: emailsFileName, type: 'emails' }
        ]
    })

    limitFilesInDirectory('./api/data/emails', MAX_EMAILS)
    clearTasksWithoutFiles()
}