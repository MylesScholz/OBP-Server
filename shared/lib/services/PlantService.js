import { PlantRepository } from '../repositories/index.js'
import { plants } from '../utils/constants.js'
import PlantTaxaService from './PlantTaxaService.js'
import FileManager from '../utils/FileManager.js'

class PlantService {
    constructor() {
        this.filePath = './shared/data/plantList.csv'
        this.header = Object.values(plants.fieldNames)
        this.repository = new PlantRepository()
    }

    /* Helper Methods */

    /*
     * formatPlant()
     * Applies basic formatting to a plant
     */
    formatPlant(document) {
        if (!document) return plants.template

        // Starting from the plant template, assign values with matching keys from the provided document
        const plant = { ...plants.template }
        Object.keys(plants.template).forEach((key) => {
            if (document.hasOwnProperty(key)) {
                plant[key] = document[key]
            }
        })

        // Set the scientific name as the _id (key) field
        plant._id = plant[plants.fieldNames.scientificName]

        return plant
    }

    /*
     * createPlantFromObservation()
     * Creates a fully formatted plant object from a given observation
     */
    createPlantFromObservation(observation) {
        if (!observation) return

        const plant = Object.assign({}, plants.template)

        // Get plant ancestry and synonyms
        const plantAncestry = PlantTaxaService.getPlantAncestry(observation.taxon)
        const synonymIds = observation.taxon?.current_synonymous_taxon_ids?.map((id) => id.toString()) ?? []
        const synonyms = PlantTaxaService.getTaxonNamesByIds(synonymIds)

        // Tag this plant as new
        plant.new = true

        plant[plants.fieldNames.scientificName] = observation.taxon?.name ?? ''
        plant[plants.fieldNames.synonym] = synonyms.join(';')
        plant[plants.fieldNames.commonName] = observation.taxon?.preferred_common_name ?? ''

        plant[plants.fieldNames.origin] = observation.taxon?.native ? 'native' : ''

        plant[plants.fieldNames.family] = plantAncestry.family

        // Set the scientific name as the _id (key) field
        plant._id = plant[plants.fieldNames.scientificName]

        return plant
    }

    /* Main Methods */

    /*
     * createPlants()
     * Inserts multiple plants into the database
     */
    async createPlants(documents) {
        // Return object containing information about inserted and duplicate determinations
        const results = {
            insertedCount: 0,
            insertedIds: [],
            duplicates: []
        }

        // Apply basic formatting
        const plants = documents?.map((document) => this.formatPlant(document))

        // Return if no documents were provided
        if (!plants || plants.length === 0) return results

        try {
            const response = await this.repository.createMany(plants)

            results.insertedCount = Object.values(response).length
            results.insertedIds = Object.values(response)
        } catch (error) {
            if (error.name === 'MongoBulkWriteError') {
                // Capture successfully inserted plant data
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
     * createPlantsFromFile()
     * Reads the plantList chunk-by-chunk and inserts it into the database
     */
    async createPlantsFromFile() {
        const chunkSize = 5000
        // Return object containing information about inserted and duplicate plants
        const results = {
            insertedCount: 0,
            insertedIds: [],
            duplicates: []
        }

        for await (const chunk of FileManager.readCSVChunks(this.filePath, chunkSize)) {
            const chunkResults = await this.createPlants(chunk)
            
            // Add the results for this chunk to the running total
            results.insertedCount += chunkResults.insertedCount
            results.insertedIds = results.insertedIds.concat(chunkResults.insertedIds)
            results.duplicates = results.duplicates.concat(chunkResults.duplicates)
        }

        return results
    }

    /*
     * createPlantsFromObservations()
     * Inserts multiple plants created from a list of observations
     */
    async createPlantsFromObservations(observations) {
        // Return object containing information about inserted and duplicate plants
        const results = {
            insertedCount: 0,
            insertedIds: [],
            duplicates: []
        }

        // Convert observations into plants
        const plants = observations?.map((observation) => this.createPlantFromObservation(observation))?.filter((plant) => !!plant._id) ?? []

        // Return if no documents were provided
        if (!plants || plants.length === 0) return results

        try {
            const response = await this.repository.createMany(plants)

            results.insertedCount = Object.values(response).length
            results.insertedIds = Object.values(response)
        } catch (error) {
            if (error.name === 'MongoBulkWriteError') {
                // Capture successfully inserted plant data
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
     * getPlants()
     * Returns all plants matching a given filter
     */
    async getPlants(filter = {}, options = {}) {
        return await this.repository.findMany(filter, options)
    }

    /*
     * getPlantsPage()
     * Returns a page of plants from the database
     */
    async getPlantsPage(options = {}) {
        const sortConfig = [
            { field: 'new', direction: 1, type: 'string' },
            { field: plants.fieldNames.scientificName, direction: 1, type: 'string' }
        ]
        return await this.repository.paginate({ ...options, sortConfig })
    }

    /*
     * writePlantsFromDatabase()
     * Writes plants in the database to plantList.csv
     */
    async writePlantsFromDatabase(filter = {}) {
        await FileManager.writeCSVFromDatabase(
            this.filePath,
            this.header,
            async (page) => this.getPlantsPage({ page, filter })
        )
    }

    /*
     * deletePlants()
     * Deletes plants matching a given filter from the database
     */
    async deletePlants(filter = {}) {
        return await this.repository.deleteMany(filter)
    }
}

export default new PlantService()