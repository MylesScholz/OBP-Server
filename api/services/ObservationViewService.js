import { ObservationViewRepository } from '../repositories/index.js'

class ObservationViewService {
    constructor() {
        this.repository = new ObservationViewRepository()
    }

    async getObservationsWithOccurrences(filter = {}) {
        return await this.repository.findMany(filter)
    }

    async getObservationViewPage(page, options = {}) {
        return await this.repository.paginate({ ...options, page })
    }
}

export default new ObservationViewService()