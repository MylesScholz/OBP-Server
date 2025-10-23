import { ObservationRepository } from '../repositories/index.js'
import { obsFieldNames, obsTemplate, ofvs } from '../utils/constants.js'
import ApiService from './ApiService.js'
import FileManager from '../utils/FileManager.js'
import { getOFV } from '../utils/utilities.js'

class ObservationService {
    constructor() {
        this.repository = new ObservationRepository()
    }

    /* Helper Methods */

    filterObservationFields(observation) {
        const observationFields = [
            'uuid',
            'id',
            'positional_accuracy',
            'observed_on',
            'place_ids',
            'taxon',
            'ofvs',
            'uri',
            'geojson',
            'user',
            'place_guess',
            'matched'       // Custom field
        ]

        const filteredObservation = {}
        for (const field of Object.keys(observation)) {
            if (observationFields.includes(field)) {
                filteredObservation[field] = observation[field]
            }
        }

        return filteredObservation
    }

    /* Main Methods */

    async createObservation(document) {
        const filteredObservation = this.filterObservationFields(document)

        return await this.repository.create(filteredObservation)
    }

    async createObservations(documents) {
        const filteredObservations = documents?.map((doc) => this.filterObservationFields(doc))

        return await this.repository.createMany(filteredObservations)
    }

    async pullObservations(sources, minDate, maxDate, updateProgress) {
        if (!sources || !minDate || !maxDate) return

        let observations = []
        for (let i = 0; i < sources.length; i++) {
            const sourceObservations = await ApiService.fetchSourceObservations(sources[i], minDate, maxDate, async (percentage) => {
                await updateProgress((100 * i + percentage) / sources.length)
            })
            observations = observations.concat(sourceObservations)
        }
        observations = observations.map((obs) => ({ ...obs, matched: false }))

        return this.createObservations(observations)
    }

    async getObservations(filter = {}, options = {}) {
        return await this.repository.findMany(filter, options)
    }

    async getDistinctCoordinates() {
        return await this.repository.distinctCoordinates()
    }

    async getUnmatchedObservations() {
        return await this.repository.findUnmatched()
    }

    /*
     * flattenObservation()
     * Converts an observation to a flat object ready for CSV writing
     */
    flattenObservation(observation) {
        const flatObservation = Object.assign({}, obsTemplate)
        if (!observation) return flatObservation

        // Find the observation field values (OFVs) for sampleId and number of bees collected
        const rawSampleId = getOFV(observation.ofvs, ofvs.sampleId)
        const rawBeesCollected = getOFV(observation.ofvs, ofvs.beesCollected)
        const sampleId = !isNaN(parseInt(rawSampleId)) ? parseInt(rawSampleId).toString() : ''
        const beesCollected = !isNaN(parseInt(rawBeesCollected)) ? parseInt(rawBeesCollected).toString() : ''

        flatObservation[obsFieldNames.uuid] = observation.uuid ?? ''
        flatObservation[obsFieldNames.id] = observation.id?.toString() ?? ''

        flatObservation[obsFieldNames.positionalAccuracy] = observation.positional_accuracy?.toString() ?? ''

        flatObservation[obsFieldNames.observedOn] = observation.observed_on ?? ''

        flatObservation[obsFieldNames.placeIds] = observation.place_ids?.join(';')

        flatObservation[obsFieldNames.minSpeciesAncestry] = observation.taxon?.min_species_ancestry?.replaceAll(',', ';') ?? ''
        flatObservation[obsFieldNames.native] = observation.taxon?.native ?? ''
        flatObservation[obsFieldNames.scientificName] = observation.taxon?.name ?? ''
        flatObservation[obsFieldNames.taxonRank] = observation.taxon?.rank ?? ''
        flatObservation[obsFieldNames.synonyms] = observation.taxon?.current_synonymous_taxon_ids?.join(';') ?? ''
        flatObservation[obsFieldNames.commonName] = observation.taxon?.preferred_common_name ?? ''

        flatObservation[obsFieldNames.sampleId] = sampleId
        flatObservation[obsFieldNames.beesCollected] = beesCollected

        flatObservation[obsFieldNames.uri] = observation.uri ?? ''

        flatObservation[obsFieldNames.latitude] = observation.geojson?.coordinates?.at(1)?.toString() ?? ''
        flatObservation[obsFieldNames.longitude] = observation.geojson?.coordinates?.at(0)?.toString() ?? ''

        flatObservation[obsFieldNames.userId] = observation.user?.id?.toString() ?? ''
        flatObservation[obsFieldNames.userLogin] = observation.user?.login ?? ''

        flatObservation[obsFieldNames.placeGuess] = observation.place_guess ?? ''

        return flatObservation
    }

    /*
     * writeObservationsFromDatabase()
     * Flattens and writes all observations matching a given filter to a CSV file at the given file path
     */
    async writeObservationsFromDatabase(filePath, filter = {}) {
        if (!filePath) return

        const observations = await this.getObservations(filter)
        const flatObservations = observations.map((observation) => this.flattenObservation(observation))

        FileManager.writeCSV(filePath, flatObservations, Object.keys(obsTemplate))
    }

    async deleteObservations() {
        return await this.repository.deleteMany()
    }
}

export default new ObservationService()