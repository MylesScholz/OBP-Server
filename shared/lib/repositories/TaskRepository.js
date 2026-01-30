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
            },
            $unset: {
                progress: ''
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

    async updateSubtaskOutputsById(id, subtaskType, outputs) {
        const task = await this.findById(id)
        if (!task) return

        const subtaskIndex = task.subtasks.findIndex((subtask) => subtask.type === subtaskType)
        if (subtaskIndex === -1) return

        task.subtasks[subtaskIndex].outputs = outputs

        return await this.updateById(id, {
            $set: {
                subtasks: task.subtasks
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