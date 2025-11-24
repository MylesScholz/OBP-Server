import BaseRepository from './BaseRepository.js'

export default class ObservationViewRepository extends BaseRepository {
    constructor() {
        super('observationsIJoinOccurrences')
    }
}