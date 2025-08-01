import TaskService from '../services/TaskService.js'
import UsernamesService from '../services/UsernamesService.js'
import FileManager from '../utils/FileManager.js'
import { fieldNames, fileLimits, requiredFields, usernames } from '../utils/constants.js'
import OccurrenceService from '../services/OccurrenceService.js'

/*
 * writeAddressesFile()
 * Writes user addresses to a CSV file at the given file path
 */
function writeAddressesFile(filePath, users) {
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

export default async function processAddressesTask(task) {
    if (!task) { return }
    
    const taskId = task._id

    // Input and output file names
    const uploadFilePath = './api/data' + task.dataset.replace('/api', '')      // task.dataset has a '/api' suffix, which should be removed
    const addressesFileName = `addresses_${task.tag}.csv`
    const addressesFilePath = './api/data/addresses/' + addressesFileName

    await TaskService.logTaskStep(taskId, 'Formatting and uploading provided dataset')
    
    // Delete old occurrences (from previous tasks)
    await OccurrenceService.deleteOccurrences()

    // Read data from the input occurrence file and insert it into the occurrences database table
    await OccurrenceService.createOccurrencesFromFile(uploadFilePath)

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
    writeAddressesFile(addressesFilePath, filteredUsers)

    // Update the task result with the output files
    await TaskService.updateResultById(taskId, {
        outputs: [
            { uri: `/api/addresses/${addressesFileName}`, fileName: addressesFileName, type: 'addresses' }
        ]
    })

    // Archive excess output files
    FileManager.limitFilesInDirectory('./api/data/addresses', fileLimits.maxAddresses)
    // Clean up tasks
    await TaskService.deleteTasksWithoutFiles()
}