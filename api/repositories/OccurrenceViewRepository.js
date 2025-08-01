import BaseRepository from './BaseRepository.js'

export default class OccurrenceViewRepository extends BaseRepository {
    constructor() {
        super('occurrencesIJoinObservations')
    }
}