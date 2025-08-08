import BaseRepository from './BaseRepository.js'

export default class TaskRepository extends BaseRepository {
    constructor() {
        super('tasks')
    }

    /* CRUD Operations */

    // Update
    async completeById(id) {
        return await this.updateById(id, {
            $set: {
                status: 'Completed',
                completedAt: new Date().toISOString()
            }
        })
    }

    async updateCurrentSubtaskById(id, subtask) {
        return await this.updateById(id, {
            $set: {
                currentSubtask: subtask
            }
        })
    }

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
                result,
            },
            $unset: {
                progress: ''
            }
        })
    }

    async failById(id) {
        return await this.updateById(id, {
            $set: {
                status: 'Failed',
                completedAt: new Date().toISOString()
            }
        })
    }
}