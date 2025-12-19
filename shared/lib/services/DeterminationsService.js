import { DeterminationsRepository } from '../repositories/index.js'
import { determinations, fieldNames } from '../utils/constants.js'
import FileManager from '../utils/FileManager.js'

class DeterminationsService {
    constructor() {
        this.filePath = './shared/data/determinations.csv'
        this.header = Object.values(determinations.fieldNames)
        this.repository = new DeterminationsRepository()
    }

    /*
     * formatDetermination()
     * Applies basic formatting to a determination; if format is 'ecdysis' extracts the fieldNumber from the catalogNumber field
     */
    formatDetermination(document, format) {
        if (!document) return determinations.template

        // Starting from the determinations template, assign values with matching keys from the provided document
        const determination = { ...determinations.template }
        Object.keys(determinations.template).forEach((key) => {
            if (document.hasOwnProperty(key)) {
                determination[key] = document[key]
            }
        })

        // If format is 'ecdysis', try to extract the fieldNumber from the catalogNumber field
        if (format === 'ecdysis') {
            determination[determinations.fieldNames.fieldNumber] ||= document[fieldNames.catalogNumber]?.replace('WSDA_', '') ?? ''
        }

        // Set the fieldNumber field as the _id (key) field
        determination._id = determination[determinations.fieldNames.fieldNumber]

        return determination
    }

    /*
     * createDeterminations()
     * Inserts multiple determinations into the database
     */
    async createDeterminations(documents) {
        // Return object containing information about inserted and duplicate determinations
        const results = {
            insertedCount: 0,
            insertedIds: [],
            duplicates: []
        }

        const determinations = documents?.map((document) => this.formatDetermination(document))

        // Return if no documents were provided
        if (!determinations || determinations.length === 0) return results

        try {
            const response = await this.repository.createMany(determinations)

            results.insertedCount = Object.values(response).length
            results.insertedIds = Object.values(response)
        } catch (error) {
            if (error.name === 'MongoBulkWriteError') {
                // Capture successfully inserted determinations data
                if (error.result && error.result.insertedCount) {
                    results.insertedCount = error.result.insertedCount
                    results.insertedIds = Object.values(error.result.insertedIds)
                }

                // Capture duplicate data
                error.writeErrors?.forEach((writeError) => {
                    if (writeError.code === 11000 && writeError.err?.op) {  // Mongo Server E11000 duplicate key error
                        results.duplicates.push(writeError.err.op)
                    }
                })
            } else {
                throw error
            }
        }

        return results
    }

    /*
     * createDeterminationsFromFile()
     * Reads the determinations file chunk-by-chunk and inserts it into the database
     */
    async createDeterminationsFromFile() {
        const chunkSize = 5000
        // Return object containing information about inserted and duplicate determinations
        const results = {
            insertedCount: 0,
            insertedIds: [],
            duplicates: []
        }

        for await (const chunk of FileManager.readCSVChunks(this.filePath, chunkSize)) {
            const chunkResults = await this.createDeterminations(chunk)
            
            // Add the results for this chunk to the running total
            results.insertedCount += chunkResults.insertedCount
            results.insertedIds = results.insertedIds.concat(chunkResults.insertedIds)
            results.duplicates = results.duplicates.concat(chunkResults.duplicates)
        }

        return results
    }

    /*
     * upsertDetermination()
     * Inserts or updates a determination
     */
    async upsertDetermination(document, skipFormatting = false) {
        // Return object containing information about updated and inserted determinations
        const results = {
            modifiedCount: 0,
            upsertedCount: 0,
            upsertedIds: []
        }

        const determination = skipFormatting ? document : this.formatDetermination(document)

        try {
            const response = await this.repository.updateById(determination._id, { $set: determination }, { upsert: true })

            results.modifiedCount = response.modifiedCount
            results.upsertedCount = response.upsertedCount
            results.upsertedIds.push(response.upsertedId)
        } catch (error) {
            console.error('Error while upserting determination:', document)
            console.error(error)
        }

        return results
    }

    /*
     * upsertDeterminations()
     * Inserts or updates multiple determinations
     */
    async upsertDeterminations(documents, format) {
        // Return object containing information about updated and inserted determinations
        const results = {
            modifiedCount: 0,
            upsertedCount: 0,
            upsertedIds: []
        }

        const determinations = documents?.map((document) => this.formatDetermination(document, format))

        // Return if no documents were provided
        if (!determinations || determinations.length === 0) return results

        for (const determination of determinations) {
            const determinationResults = await this.upsertDetermination(determination, true)

            results.modifiedCount += determinationResults.modifiedCount
            results.upsertedCount += determinationResults.upsertedCount
            results.upsertedIds = results.upsertedIds.concat(determinationResults.upsertedIds)
        }

        return results
    }

    /*
     * upsertDeterminationsFromFile()
     * Inserts or updates determinations data from a given file path into the database
     */
    async upsertDeterminationsFromFile(filePath, format) {
        const chunkSize = 5000
        // Return object containing information about updated and inserted determinations
        const results = {
            modifiedCount: 0,
            upsertedCount: 0,
            upsertedIds: []
        }

        for await (const chunk of FileManager.readCSVChunks(filePath, chunkSize)) {
            // Filter 'undetermined' records (from Ecdysis)
            const filteredChunk = chunk.filter((record) => {
                // Check that some field (from the template fieldset) is defined other than fieldNumber and sex
                const determinationFields = Object.keys(determinations.template).filter((key) => key !== determinations.fieldNames.sex && key !== determinations.fieldNames.fieldNumber)
                // If sex is defined and not 'undetermined', include the record as well
                return determinationFields.some((key) => !!record[key]) || (record[determinations.fieldNames.sex] !== 'undetermined' && !!record[determinations.fieldNames.sex])
            })
            const chunkResults = await this.upsertDeterminations(filteredChunk, format)

            results.modifiedCount += chunkResults.modifiedCount
            results.upsertedCount += chunkResults.upsertedCount
            results.upsertedIds = results.upsertedIds.concat(chunkResults.upsertedIds)
        }

        return results
    }

    /*
     * getDeterminations()
     * Returns all determinations matching a given filter
     */
    async getDeterminations(filter = {}, options = {}) {
        return await this.repository.findMany(filter, options)
    }

    /*
     * getDeterminationsPage()
     * Returns a page of determinations from the database
     */
    async getDeterminationsPage(options = {}) {
        return await this.repository.paginate({ ...options })
    }

    /*
     * writeDeterminationsFromDatabase()
     * Writes determinations in the database to determinations.csv
     */
    async writeDeterminationsFromDatabase(filter = {}) {
        await FileManager.writeCSVFromDatabase(
            this.filePath,
            this.header,
            async (page) => this.getDeterminationsPage({ page, filter })
        )
    }

    /*
     * deleteDeterminations()
     * Deletes determinations matching a given filter from the database
     */
    async deleteDeterminations(filter = {}) {
        return await this.repository.deleteMany(filter)
    }
}

export default new DeterminationsService()