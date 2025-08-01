import fs from 'fs'

import { TaskRepository } from '../repositories/index.js'
import QueueManager from '../messaging/QueueManager.js'
import { InvalidArgumentError, ValidationError } from '../utils/errors.js'

class TaskService {
    constructor() {
        this.repository = new TaskRepository()
    }

    /*
     * createTask()
     * Creates a new task with the given properties
     */
    async createTask(type, dataset, sources, minDate, maxDate) {
        const taskTypes = [ 'observations', 'labels', 'addresses', 'emails' ]
        if (!taskTypes.includes(type)) {
            throw new InvalidArgumentError('Invalid task type')
        }
        if (sources?.some((src) => !parseInt(src))) {
            throw new InvalidArgumentError('sources must be a numeric Array')
        }
        if (sources && !(minDate && maxDate)) {
            throw new ValidationError('minDate and maxDate are required if sources are provided')
        }

        const sourceAbbreviations = {
            '18521': 'OBA',
            '99706': 'MM',
            '166376': 'WaBA'
        }
        const sourceString = sources?.map((s) => sourceAbbreviations[s] ?? s)?.join('_')
        const createdAt = new Date()
        const createdAtDate = `${createdAt.getFullYear()}-${createdAt.getMonth() + 1}-${createdAt.getDate()}`
        const createdAtTime = `${createdAt.getHours()}.${createdAt.getMinutes()}.${createdAt.getSeconds()}`
        const tag = `${sourceString ? sourceString + '_' : ''}${createdAtDate}T${createdAtTime}`

        const task = {
            name: `${type}Task_${tag}`,
            tag,
            type,
            dataset,
            status: 'Pending',
            createdAt: createdAt.toISOString()
        }
        // Optional task fields (only used for 'observations' tasks)
        if (sources) task.sources = sources
        if (minDate && maxDate) {
            // Parse minDate and maxDate arguments
            const parsedMinDate = new Date(minDate)
            const parsedMaxDate = new Date(maxDate)
            if (parsedMinDate > parsedMaxDate) {
                throw new ValidationError('minDate must be before maxDate')
            }

            // Format dates how the API (and iNaturalist) expect (YYYY-MM-DD)
            const formattedMinDate = `${parsedMinDate.getUTCFullYear()}-${(parsedMinDate.getUTCMonth() + 1).toString().padStart(2, '0')}-${parsedMinDate.getUTCDate().toString().padStart(2, '0')}`
            const formattedMaxDate = `${parsedMaxDate.getUTCFullYear()}-${(parsedMaxDate.getUTCMonth() + 1).toString().padStart(2, '0')}-${parsedMaxDate.getUTCDate().toString().padStart(2, '0')}`

            task.minDate = formattedMinDate
            task.maxDate = formattedMaxDate
        }

        // Create the task
        const insertedId = await this.repository.create(task)

        // Publish task ID to RabbitMQ queue
       await QueueManager.publishMessage(insertedId.toString())

        return {
            insertedId,
            createdAt: task.createdAt
        }
    }

    /*
     * getTasks()
     * Finds all tasks
     */
    async getTasks() {
        return await this.repository.findMany()
    }

    /*
     * getTaskById()
     * Finds a specific task by its Mongo ID
     */
    async getTaskById(id) {
        return await this.repository.findById(id)
    }

    /*
     * logTaskStep()
     * Updates a given task's current step message and logs the same message to the console
     */
    async logTaskStep(id, message) {
        await this.updateProgressById(id, { currentStep: message })
        console.log(`\t${message}...`)
    }

    /*
     * updateProgressById()
     * Updates the progress field of a task selected by ID; sets the status to 'Running'
     */
    async updateProgressById(id, progress) {
        return await this.repository.updateProgressById(id, progress)
    }

    /*
     * updateProgressPercentageById()
     * Updates the progress.percentage field of a task selected by ID; sets the status to 'Running'
     */
    async updateProgressPercentageById(id, percentage) {
        if (percentage === null || percentage === undefined || percentage === NaN) return

        const task = await this.repository.findById(id)

        const formattedPercentage = typeof percentage === 'number' && !isNaN(parseFloat(percentage))
            ? `${percentage.toFixed(2).toString()}%`
            : percentage

        return await this.repository.updateProgressById(id, {
            ...task?.progress,
            percentage: formattedPercentage
        })
    }

    /*
     * updateWarningsById()
     * Updates the warnings field of a task selected by ID
     */
    async updateWarningsById(id, warnings) {
        return await this.repository.updateWarningsById(id, warnings)
    }

    /*
     * updateResultById()
     * Updates the result field of a task selected by ID; sets the status to 'Completed'
     */
    async updateResultById(id, result) {
        return await this.repository.updateResultById(id, result)
    }

    /*
     * updateFailureById()
     * Sets the status field of a task selected by ID to 'Failed'
     */
    async updateFailureById(id) {
        return await this.repository.updateFailureById(id)
    }

    /*
     * deleteTasks()
     * Deletes all tasks
     */
    async deleteTasks() {
        return await this.repository.deleteMany()
    }

    /*
     * deleteTasksWithoutFiles()
     * Deletes all tasks with non-existent 'dataset' or 'result' files
     */
    async deleteTasksWithoutFiles() {
        // Find tasks with missing files (dataset or result)
        const tasks = await this.repository.findMany()
        const taskIdsWithoutFiles = tasks
            .filter((t) =>
                (t.status !== 'Completed' && !fs.existsSync(t.dataset)) ||
                (t.result && t.result.outputs.some((o) => !fs.existsSync(`./api/data/${o.type}/${o.fileName}`)))
            )
            .map((t) => t._id)
        
        // Delete tasks with missing files
        return await this.repository.deleteMany({ _id: { $in: taskIdsWithoutFiles } })
    }
}

export default new TaskService()