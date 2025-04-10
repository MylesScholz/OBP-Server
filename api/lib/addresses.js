import fs from 'fs'
import { parse as parseSync } from 'csv-parse/sync'
import { stringify as stringifySync } from 'csv-stringify/sync'

import { clearTasksWithoutFiles, updateTaskInProgress } from "../models/task.js"
import { limitFilesInDirectory } from "./utilities.js"

/* Constants */

// Maximum number of output files stored on the server
const MAX_ADDRESSES = 25
// Field names
const USER_LOGIN = 'userLogin'
const FULL_NAME = 'fullName'
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
 * readOccurrencesFile()
 * Parses an input occurrences CSV file into a list of objects
 */
function readOccurrencesFile(filePath) {
    const occurrencesBuffer = fs.readFileSync(filePath)
    const occurrences = parseSync(occurrencesBuffer, { columns: true })

    return occurrences
}

/*
 * readUsernamesFile()
 * Parses /api/data/usernames.csv into a JS object
 */
function readUsernamesFile() {
    // If /api/data/usernames.csv doesn't exist locally, create a base version and save it
    if (!fs.existsSync('./api/data/usernames.csv')) {
        const header = ['userLogin', 'fullName', 'firstName', 'firstNameInitial', 'lastName', 'email', 'address', 'city', 'stateProvince', 'country', 'zip']
        const csv = stringifySync([], { header: true, columns: header })
        fs.writeFileSync('./api/data/usernames.csv', csv)
    }
    
    // Read and parse /api/data/usernames.csv
    const usernamesData = fs.readFileSync('./api/data/usernames.csv')
    return parseSync(usernamesData, { columns: true, skip_empty_lines: true, relax_quotes: true })
}

/*
 * filterUsersByOccurrences()
 * Filters a given list of user data down to rows with USER_LOGIN values that occur in a given occurrence dataset
 */
function filterUsersByOccurrences(users, occurrences) {
    const uniqueUserLogins = new Set(occurrences.map((o) => o[USER_LOGIN]))
    const filteredUsers = users.filter((user) => uniqueUserLogins.has(user[USER_LOGIN]))

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

    await updateTaskInProgress(taskId, { currentStep: 'Compiling user addresses...' })
    console.log('\tCompiling user addresses...')

    // Read datasets into memory
    const occurrences = readOccurrencesFile('./api/data' + task.dataset.replace('/api', '')) // task.dataset has a '/api' suffix, which should be removed
    const users = readUsernamesFile()

    // Filter users down to those with USER_LOGIN values in the provided occurrence dataset
    const filteredUsers = filterUsersByOccurrences(users, occurrences)

    // Write to the output file
    const addressesFileName = `addresses_${task.tag}.csv`
    const addressesFilePath = './api/data/addresses/' + addressesFileName
    writeAddressesFile(addressesFilePath, filteredUsers)

    limitFilesInDirectory('./api/data/addresses', MAX_ADDRESSES)
    clearTasksWithoutFiles()
}