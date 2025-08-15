import BaseSubtaskHandler from './BaseSubtaskHandler.js'
import { fieldNames, fileLimits, requiredFields, usernames } from '../utils/constants.js'
import { OccurrenceService, TaskService, UsernamesService } from '../services/index.js'
import FileManager from '../utils/FileManager.js'

export default class AddressesSubtaskHandler extends BaseSubtaskHandler {
    constructor() {
        super()
    }

    /* Private Helper Methods */

    /*
     * #writeAddressesFile()
     * Writes user addresses to a CSV file at the given file path
     */
    #writeAddressesFile(filePath, users) {
        const addressFields = [
            usernames.fieldNames.fullName,
            usernames.fieldNames.address,
            usernames.fieldNames.city,
            usernames.fieldNames.stateProvince,
            usernames.fieldNames.zipPostal,
            usernames.fieldNames.country,
        ]

        // Reduce each user object to just the address output fields
        const addresses = users.map((user) => {
            const address = {}
            for (const field of addressFields) {
                address[field] = user[field] ?? ''
            }
            return address
        })

        return FileManager.writeCSV(filePath, addresses, addressFields)
    }

    /* Main Handler Method */

    async handleTask(taskId) {
        if (!taskId) { return }
        
        // Update the current subtask
        await TaskService.updateCurrentSubtaskById(taskId, 'addresses')

        // Fetch the task, subtask, and previous outputs
        const task = await TaskService.getTaskById(taskId)
        const subtask = task.subtasks.find((subtask) => subtask.type === 'addresses')
        const previousSubtaskOutputs = task.result?.subtaskOutputs ?? []

        // Input and output file names

        // Set the default input file to the file upload
        let inputFilePath = task.upload.filePath
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
        const addressesFileName = `addresses_${task.tag}.csv`
        const addressesFilePath = './api/data/addresses/' + addressesFileName

        await TaskService.logTaskStep(taskId, 'Formatting and uploading provided dataset')
        
        // Delete old occurrences (from previous tasks)
        await OccurrenceService.deleteOccurrences()

        // Read data from the input occurrence file and insert it into the occurrences database table
        await OccurrenceService.createOccurrencesFromFile(inputFilePath)

        await TaskService.logTaskStep(taskId, 'Compiling user mailing addresses')

        // Read users dataset; extract userLogins
        const users = UsernamesService.readUsernames()
        const userLogins = users.map((user) => user[usernames.fieldNames.userLogin])
                                .filter((userLogin) => !!userLogin)

        // Get printable occurrences with known user data; extract iNaturalist aliases (userLogins)
        const printableOccurrences = await OccurrenceService.getPrintableOccurrences(requiredFields, userLogins)
        const aliases = printableOccurrences.map((occurrence) => occurrence[fieldNames.iNaturalistAlias])
                                            .filter((alias) => !!alias)
        
        // Filter user data to only those with userLogins matching printable occurrences
        const filteredUsers = users.filter((user) => aliases.includes(user[usernames.fieldNames.userLogin]))
        
        // Write output file
        this.#writeAddressesFile(addressesFilePath, filteredUsers)

        // Update the task result with the output files
        const outputs = [
            { uri: `/api/addresses/${addressesFileName}`, fileName: addressesFileName, type: 'addresses' }
        ]
        previousSubtaskOutputs.push({ type: subtask.type, outputs })
        await TaskService.updateResultById(taskId, {
            subtaskOutputs: previousSubtaskOutputs
        })

        // Archive excess output files
        FileManager.limitFilesInDirectory('./api/data/addresses', fileLimits.maxAddresses)
    }
}