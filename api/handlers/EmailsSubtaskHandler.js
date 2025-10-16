import BaseSubtaskHandler from './BaseSubtaskHandler.js'
import { fieldNames, fileLimits, usernames } from '../utils/constants.js'
import { OccurrenceService, TaskService, UsernamesService } from '../services/index.js'
import FileManager from '../utils/FileManager.js'

export default class EmailsSubtaskHandler extends BaseSubtaskHandler {
    constructor() {
        super()
    }

    /* Private Helper Methods */

    /*
     * #buildUserErrorMap()
     * Builds an object that maps each user login (from a getErrorFlagsByUserIds query) to its corresponding error flags (as an Array)
     */
    #buildUserErrorMap(userErrors) {
        const userErrorMap = {}

        userErrors?.forEach((user) => {
            const userLogin = user[fieldNames.iNaturalistAlias]
            const errorFlags = user[fieldNames.errorFlags]?.split(';') ?? []

            userErrorMap[userLogin] = errorFlags
        })

        return userErrorMap
    }

    /*
     * #buildUserEmailMap()
     * Builds an object that maps each user login (from usernames.csv) to its corresponding email
     */
    #buildUserEmailMap(users) {
        const userEmailMap = {}

        users?.forEach((user) => {
            const userLogin = user[usernames.fieldNames.userLogin]
            const email = user[usernames.fieldNames.email]

            if (userLogin && email) {
                userEmailMap[userLogin] = email
            }
        })

        return userEmailMap
    }

    /*
     * #buildEmailCategories()
     * Builds three lists of emails categorized by error type (location, accuracy, and taxonomy)
     */
    #buildEmailCategories(userErrorMap, userEmailMap) {
        // Lists of field names that imply membership in each category of email list
        const locationErrorFlags = [
            fieldNames.locality
        ]
        const accuracyErrorFlags = [
            fieldNames.accuracy
        ]
        const taxonomyErrorFlags = [
            fieldNames.plantPhylum,
            fieldNames.plantOrder,
            fieldNames.plantFamily,
            fieldNames.plantGenus,
            fieldNames.plantSpecies,
            fieldNames.plantTaxonRank
        ]

        // Categorize user emails into different lists by error type
        const locationEmails = [], accuracyEmails = [], taxonomyEmails = []
        for (const [ userLogin, errorFlags ] of Object.entries(userErrorMap)) {
            // Skip users with unknown emails
            if (!userEmailMap[userLogin]) continue

            // Push user's email to matching categories independently
            if (locationErrorFlags.some((field) => errorFlags.includes(field))) {
                locationEmails.push(userEmailMap[userLogin])
            }
            if (accuracyErrorFlags.some((field) => errorFlags.includes(field))) {
                accuracyEmails.push(userEmailMap[userLogin])
            }
            if (taxonomyErrorFlags.some((field) => errorFlags.includes(field))) {
                taxonomyEmails.push(userEmailMap[userLogin])
            }
        }

        return { locationEmails, accuracyEmails, taxonomyEmails }
    }

    /*
     * #writeEmailsFile()
     * Writes user emails divided into error categories to a CSV file at the given file path
     */
    #writeEmailsFile(filePath, locationEmails, accuracyEmails, taxonomyEmails) {
        const emailsHeader = [
            'locationEmails',
            'accuracyEmails',
            'taxonomyEmails'
        ]

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

        return FileManager.writeCSV(filePath, emailRows, emailsHeader)
    }

    /* Main Handler Method */

    async handleTask(taskId) {
        if (!taskId) { return }

        // Update the current subtask
        await TaskService.updateCurrentSubtaskById(taskId, 'emails')

        // Fetch the task, subtask, and previous outputs
        const task = await TaskService.getTaskById(taskId)
        const subtask = task.subtasks.find((subtask) => subtask.type === 'emails')
        const previousSubtaskOutputs = task.result?.subtaskOutputs ?? []

        // Input and output file names

        // Set the default input file to the file upload
        let inputFilePath = task.upload?.filePath ?? ''
        // If not using the upload file, try to find the specified input file in the previous subtask outputs
        if (subtask.input !== 'upload') {
            const subtaskInputSplit = subtask.input?.split('_') ?? []
            const subtaskInputIndex = parseInt(subtaskInputSplit[0])
            const subtaskInputFileType = subtaskInputSplit[1]
            
            // Get the output file list from the given subtask index
            const outputs = previousSubtaskOutputs[subtaskInputIndex]?.outputs
            // Get the output file matching the given input file type
            const outputFile = outputs?.find((output) => output.type === subtaskInputFileType)

            // Build the input file path if the given file was found in the previous subtask outputs
            inputFilePath = outputFile ? `./api/data/${outputFile.type}/${outputFile.fileName}` : inputFilePath
        }
        const emailsFileName = `emails_${task.tag}.csv`
        const emailsFilePath = './api/data/emails/' + emailsFileName

        await TaskService.logTaskStep(taskId, 'Formatting and uploading provided dataset')

        // Delete old occurrences (from previous tasks)
        await OccurrenceService.deleteOccurrences()

        // Read data from the input occurrence file and insert it into the occurrences database table
        await OccurrenceService.createOccurrencesFromFile(inputFilePath)

        await TaskService.logTaskStep(taskId, 'Compiling user email addresses')

        // Read users dataset; extract the userLogins
        const users = UsernamesService.readUsernames()
        const userLogins = users.map((user) => user[usernames.fieldNames.userLogin])
                                .filter((userLogin) => !!userLogin)
        
        const userErrors = await OccurrenceService.getErrorFlagsByUserLogins(userLogins)

        // Construct a map of each user login to its corresponding error flags (as an Array)
        const userErrorMap = this.#buildUserErrorMap(userErrors)

        // Construct a map of each user login to its corresponding email
        const userEmailMap = this.#buildUserEmailMap(users)

        // Build three lists of emails categorized by error type (location, accuracy, and taxonomy)
        const { locationEmails, accuracyEmails, taxonomyEmails } = this.#buildEmailCategories(userErrorMap, userEmailMap)
        
        // Write output file
        this.#writeEmailsFile(emailsFilePath, locationEmails, accuracyEmails, taxonomyEmails)

        // Update the task result with the output files
        const outputs = [
            { uri: `/api/emails/${emailsFileName}`, fileName: emailsFileName, type: 'emails' }
        ]
        previousSubtaskOutputs.push({ type: subtask.type, outputs })
        await TaskService.updateResultById(taskId, {
            subtaskOutputs: previousSubtaskOutputs
        })

        // Archive excess output files
        FileManager.limitFilesInDirectory('./api/data/emails', fileLimits.maxEmails)
    }
}