import { OccurrenceViewRepository } from '../repositories/index.js'

class OccurrenceViewService {
    constructor() {
        this.repository = new OccurrenceViewRepository()
    }

    async getOccurrenceViewPage(page, options = {}) {
        const sortConfig = [ { field: 'composite_sort', direction: 1, type: 'string' } ]
        return await this.repository.paginate({ ...options, page, sortConfig })
    }
}

export default new OccurrenceViewService()