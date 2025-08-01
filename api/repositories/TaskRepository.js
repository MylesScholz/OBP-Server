import BaseRepository from './BaseRepository.js'

export default class TaskRepository extends BaseRepository {
    constructor() {
        super('tasks')
    }

    /* CRUD Operations */

    // Update
    async updateProgressById(id, progress) {
        return await this.updateById(id, {
            $set: {
                status: 'Running',
                progress
            }
        })
    }

    async updateWarningsById(id, warnings) {
        return await this.updateById(id, {
            $set: { warnings }
        })
    }

    async updateResultById(id, result) {
        return await this.updateById(id, {
            $set: {
                status: 'Completed',
                result,
                completedAt: new Date().toISOString()
            },
            $unset: {
                progress: ''
            }
        })
    }

    async updateFailureById(id) {
        return await this.updateById(id, {
            $set: {
                status: 'Failed',
                completedAt: new Date().toISOString()
            }
        })
    }
}