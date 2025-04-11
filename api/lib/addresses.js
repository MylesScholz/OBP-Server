import fs from 'fs'
import { parse as parseAsync } from 'csv-parse'
import { parse as parseSync } from 'csv-parse/sync'
import { stringify as stringifySync } from 'csv-stringify/sync'

import { clearTasksWithoutFiles, updateTaskInProgress, updateTaskResult } from "../models/task.js"
import { limitFilesInDirectory } from "./utilities.js"

/* Constants */

// Maximum number of output files stored on the server
const MAX_ADDRESSES = 25
// Maximum number of observations to read from a file at once
const CHUNK_SIZE = 5000
// Field names
const ERROR_FLAGS = 'errorFlags'
const DATE_LABEL_PRINT = 'dateLabelPrint'
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
const addressFields = [
    FULL_NAME,
    ADDRESS,
    CITY,
    STATE,
    COUNTRY,
    ZIP_CODE
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
function filterUsersByUserLogins(users, uniqueUserLogins) {
    const uniqueUserNames = new Set()
    const filteredUsers = []
    for (const user of users) {
        if (user[USER_LOGIN] && uniqueUserLogins.has(user[USER_LOGIN]) && !uniqueUserNames.has(user[FULL_NAME])) {
            uniqueUserNames.add(user[FULL_NAME])
            filteredUsers.push(user)
        }
    }

    return filteredUsers
}

/*
 * writeAddressesFile()
 * Writes user addresses to a CSV file at the given file path
 */
function writeAddressesFile(filePath, users) {
    // Reduce each user object to just the address output fields
    const addresses = users.map((user) => {
        const address = {}
        for (const field of addressFields) {
            address[field] = user[field] ?? ''
        }
        return address
    })
    const csv = stringifySync(addresses, { header: true, columns: addressFields })

    fs.writeFileSync(filePath, csv)
}

export default async function processAddressesTask(task) {
    if (!task) { return }
    
    const taskId = task._id

    await updateTaskInProgress(taskId, { currentStep: 'Compiling user mailing addresses...' })
    console.log('\tCompiling user mailing addresses...')

    // Read users dataset
    const users = readUsernamesFile()

    // Read occurrences dataset in chunks, keeping a record of unique userLogins found
    const uniqueUserLogins = new Set()
    const occurrencesFilePath = './api/data' + task.dataset.replace('/api', '') // task.dataset has a '/api' suffix, which should be removed
    for await (const chunk of readOccurrencesFileChunks(occurrencesFilePath, CHUNK_SIZE)) {
        for (const occurrence of chunk) {
            if (occurrence[USER_LOGIN] && !occurrence[ERROR_FLAGS] && !occurrence[DATE_LABEL_PRINT]) {
                uniqueUserLogins.add(occurrence[USER_LOGIN])
            }
        }
    }

    // Filter users down to those with USER_LOGIN values in the provided occurrence dataset
    const filteredUsers = filterUsersByUserLogins(users, uniqueUserLogins)

    // Write to the output file
    const addressesFileName = `addresses_${task.tag}.csv`
    const addressesFilePath = './api/data/addresses/' + addressesFileName
    writeAddressesFile(addressesFilePath, filteredUsers)

    await updateTaskResult(taskId, {
        outputs: [
            { uri: `/api/addresses/${addressesFileName}`, fileName: addressesFileName, type: 'addresses' }
        ]
    })

    limitFilesInDirectory('./api/data/addresses', MAX_ADDRESSES)
    clearTasksWithoutFiles()
}