import BaseSubtaskHandler from './BaseSubtaskHandler.js'
import { fieldNames, fileLimits, usernames } from '../../shared/lib/utils/constants.js'
import { OccurrenceService, TaskService, UsernamesService } from '../../shared/lib/services/index.js'
import FileManager from '../../shared/lib/utils/FileManager.js'

export default class EmailsSubtaskHandler extends BaseSubtaskHandler {
    constructor() {
        super()
    }

    /* Private Helper Methods */

    /*
     * #buildUserErrorMap()
     * Builds an object that maps each user login to its corresponding list of unique error flags (as an Array)
     */
    #buildUserErrorMap(userErrors) {
        const userErrorMap = {}

        userErrors?.forEach((user) => {
            const userLogin = user['userLogin'] ?? ''
            const errorFlagsList = user['errorFlagsList'] ?? []

            if (userLogin && errorFlagsList.length > 0) {
                const uniqueErrorFlags = new Set()

                for (const errorFlags of errorFlagsList) {
                    const errorFlagsSplit = errorFlags.split(';') ?? []

                    for (const flag of errorFlagsSplit) {
                        uniqueErrorFlags.add(flag)
                    }
                }

                userErrorMap[userLogin] = [ ...uniqueErrorFlags ]
            }
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
        console.log("In writeEmailsFile")
        const emailsHeader = [
            'locationEmails',
            'accuracyEmails',
            'taxonomyEmails'
        ]

        // Convert email lists into object rows
        const emailRows = []

        // push test row
        // emailRows.push({locationEmails: 'test', accuracyEmails: 'test', taxonomyEmails: 'test'})
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

    // Testing with /home/nora/Documents/work/data/bugs/emails-deletion/working-local-reproduction/flags_2026-04-20T22.08.03.csv
    async handleTask(taskId) {
        if (!taskId) { return }

        // Update the current subtask
        await TaskService.updateCurrentSubtaskById(taskId, 'emails')

        // Fetch the task, subtask, and previous outputs
        const task = await TaskService.getTaskById(taskId)
        const subtask = task.subtasks.find((subtask) => subtask.type === 'emails')

        // Input and output file names

        // Set the default input file to the file upload
        let inputFilePath = task.upload?.filePath ?? ''
        // If not using the upload file or selection, try to find the specified input file in the previous subtask outputs
        if (subtask.input !== 'upload' && subtask.input !== 'selection') {
            const subtaskInputSplit = subtask.input?.split('_') ?? []
            const subtaskInputIndex = parseInt(subtaskInputSplit[0])
            const subtaskInputFileType = subtaskInputSplit[1]
            
            // Get the output file list from the given subtask index
            const outputs = task.subtasks[subtaskInputIndex]?.outputs
            // Get the output file matching the given input file type
            const outputFile = outputs?.find((output) => output.type === subtaskInputFileType)

            // Build the input file path if the given file was found in the previous subtask outputs
            inputFilePath = outputFile ? `./shared/data/${outputFile.type}/${outputFile.fileName}` : inputFilePath
        }

        const emailsFileName = `emails_${task.tag}.csv`
        const emailsFilePath = './shared/data/emails/' + emailsFileName

        await TaskService.logTaskStep(taskId, 'Formatting and uploading provided dataset (this may take a few minutes)')

        // Delete old scratch space occurrences (from previous tasks)
        await OccurrenceService.deleteOccurrences({ scratch: true })

        // This would seem to insert a single scratch record, by Stephanie Hazen
        //  ID = 66f7462689733e7b529f9c5eefe41c07f9e831c50365f2182021697788451378

        // For some reason, this "!== selection" case seems to execute.
        //  Is this what myles intended? I thought we were working with 
        //  occurrences here, not the flags file.
        if (false && subtask.input !== 'selection') {
            // Upsert data from the input occurrence file into scratch space (existing records will be moved to scratch space)
            await OccurrenceService.upsertOccurrencesFromFile(inputFilePath, { scratch: true })

        } else {    // subtask.input === 'selection'
            // Move occurrences matching the query parameters into scratch space
            // This doesn't work, which is very concerning. What else could be broken?
            // await OccurrenceService.updateOccurrences(subtask.params?.filter ?? {}, { scratch: true })
        }

        await TaskService.logTaskStep(taskId, 'Compiling user email addresses')

        // Read users dataset; extract the userLogins
        // Reads *all* usernames from the file, all 554 of them
        const users = UsernamesService.readUsernames()  // reads all usernames
        // for each user in the complete usernames file; get the userLogin field
        const userLogins = users.map((user) => user[usernames.fieldNames.userLogin])
        // Then, only return useres with a non-empty userLogin
                                .filter((userLogin) => !!userLogin)

        // Given all of the valid usernames, get a list of users who had
        //  errorsome occurrences and a truthy scratch field
        //  by default, the function seems to grab falsy scratch fields only

        // CRASHES
        // Critically, returns an empty array, which would account for empty
        //  output from the subtask
        // const userErrors = await OccurrenceService.getErrorFlagsByUserLogins(
        //     userLogins, { scratch: true })
        const userErrors = await OccurrenceService.getErrorFlagsByUserLogins(
            userLogins)

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
        await TaskService.updateSubtaskOutputsById(taskId, 'emails', outputs)

        // Archive excess output files
        FileManager.limitFilesInDirectory('./shared/data/emails', fileLimits.maxEmails)

        // Move occurrences with a fieldNumber or no errorFlags back to non-scratch space
        // I get the impression that this unscratch filter should be "everything",
        //  not just those that have a fieldNumber or no errors
        const unscratchFilter = {
            scratch: true,
            $or: [
                { [fieldNames.fieldNumber]: { $exists: true, $nin: [ null, '' ] } },
                { [fieldNames.errorFlags]: { $exists: false } },
                { [fieldNames.errorFlags]: { $in: [ null, '' ] } }
            ]
        }
        // Why is this operation so slow? Ideally we would sub-set it anyway, but
        //  this is certainly curious. See OccurrenceRepo.updateMany for implementation
        // For the time being, probably just change the unscratchFilter to {}
        // await OccurrenceService.updateOccurrences(unscratchFilter, { scratch: false })

        // Discard remaining scratch space occurrences
        // await OccurrenceService.deleteOccurrences({ scratch: true })
        console.log("Finished")
    }
}
