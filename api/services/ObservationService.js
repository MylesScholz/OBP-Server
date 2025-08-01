import { ObservationRepository } from '../repositories/index.js'
import ApiService from './ApiService.js'

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

    async getObservations(filter = {}) {
        return await this.repository.findMany(filter)
    }

    async getDistinctCoordinates() {
        return await this.repository.distinctCoordinates()
    }

    async getUnmatchedObservations() {
        return await this.repository.findUnmatched()
    }

    async deleteObservations() {
        return await this.repository.deleteMany()
    }
}

export default new ObservationService()