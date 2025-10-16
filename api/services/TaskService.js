import fs from 'fs'

import { TaskRepository } from '../repositories/index.js'
import { InvalidArgumentError, ValidationError } from '../utils/errors.js'
import QueueManager from '../messaging/QueueManager.js'

class TaskService {
    constructor() {
        this.repository = new TaskRepository()
    }

    /*
     * parseSubtasks()
     * Parses subtasks from a given JSON string, throwing errors if any fields are invalid
     */
    parseSubtasks(subtasksJSON) {
        if (!subtasksJSON) { throw new InvalidArgumentError('subtasks must exist') }
        
        try {
            const subtasks = JSON.parse(subtasksJSON)

            const subtaskTypes = [ 'occurrences', 'observations', 'labels', 'addresses', 'emails', 'pivots' ]
            for (let i = 0; i < subtasks.length; i++) {
                const subtask = subtasks[i]
                if (!subtaskTypes.includes(subtask.type)) { throw new ValidationError(`Invalid subtask type '${subtask.type}'`) }
                
                if (subtask.type === 'observations') {
                    if (!subtask.sources || !subtask.minDate || !subtask.maxDate) {
                        throw new ValidationError('sources, minDate, and maxDate required for observations subtasks')
                    }

                    // Split the sources string
                    subtasks[i].sources = subtask.sources.split(',')

                    // Parse minDate and maxDate arguments
                    const parsedMinDate = new Date(subtask.minDate)
                    const parsedMaxDate = new Date(subtask.maxDate)
                    if (parsedMinDate > parsedMaxDate) {
                        throw new ValidationError('minDate must be before maxDate')
                    }

                    // Format dates how the API (and iNaturalist) expect (YYYY-MM-DD)
                    const formattedMinDate = `${parsedMinDate.getUTCFullYear()}-${(parsedMinDate.getUTCMonth() + 1).toString().padStart(2, '0')}-${parsedMinDate.getUTCDate().toString().padStart(2, '0')}`
                    const formattedMaxDate = `${parsedMaxDate.getUTCFullYear()}-${(parsedMaxDate.getUTCMonth() + 1).toString().padStart(2, '0')}-${parsedMaxDate.getUTCDate().toString().padStart(2, '0')}`

                    // Modify subtasks with the formatted dates
                    subtasks[i].minDate = formattedMinDate
                    subtasks[i].maxDate = formattedMaxDate
                }
            }

            return subtasks
        } catch (error) {
            if (error.message?.search('JSON.parse') !== -1) {   // Catch JSON parsing errors
                throw new ValidationError('Invalid JSON in subtasks')
            } else {
                throw error
            }
        }
    }

    /*
     * createTask()
     * Creates a new task with the given properties
     */
    async createTask(subtasksJSON, uploadFileName) {
        // Parse a valid subtasks object from the given JSON argument (throws InvalidArgumentErrors and ValidationErrors)
        const subtasks = this.parseSubtasks(subtasksJSON)

        // Create a formatted timestamp of the task's creation time (set the default tag to it)
        const createdAt = new Date()
        const createdAtDate = `${createdAt.getFullYear()}-${createdAt.getMonth() + 1}-${createdAt.getDate()}`
        const createdAtTime = `${createdAt.getHours()}.${createdAt.getMinutes()}.${createdAt.getSeconds()}`
        const tag = `${createdAtDate}T${createdAtTime}`
        const name = `task_${tag}`

        const task = {
            name,
            tag,
            subtasks,
            status: 'Pending',
            createdAt: createdAt.toISOString()
        }
        // Set the upload file if provided
        if (uploadFileName) {
            const uploadFilePath = `./api/data/uploads/${uploadFileName}`
            const uploadUri = `/api/uploads/${uploadFileName}`
            task.upload = {
                fileName: uploadFileName,
                filePath: uploadFilePath,
                uri: uploadUri
            }
        }
        // Set the first subtask as the current one
        if (subtasks.length > 0) {
            task.progress = {
                currentSubtask: subtasks[0]?.type
            }
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
        return await this.repository.findMany({}, {}, { 'createdAt': -1 })
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
        const task = await this.repository.findById(id)

        await this.updateProgressById(id, { ...task?.progress, currentStep: message })
        console.log(`\t\t${message}...`)
    }

    /*
     * completeTaskById()
     * Sets the status field of a task selected by ID to 'Completed'
     */
    async completeTaskById(id) {
        return await this.repository.completeById(id)
    }

    /*
     * updateCurrentSubtaskById()
     * Sets the currentSubtask field of a task selected by ID to the given value
     */
    async updateCurrentSubtaskById(id, subtask) {
        const task = await this.repository.findById(id)

        return await this.repository.updateProgressById(id, {
            ...task?.progress,
            currentSubtask: subtask
        })
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
     * failTaskById()
     * Sets the status field of a task selected by ID to 'Failed'
     */
    async failTaskById(id) {
        return await this.repository.failById(id)
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
                (t.result?.subtaskOutputs?.some((s) => s.outputs?.some((o) => !fs.existsSync(`./api/data/${o.type}/${o.fileName}`))))
            )
            .map((t) => t._id)

        // Delete tasks with missing files
        return await this.repository.deleteMany({ _id: { $in: taskIdsWithoutFiles } })
    }
}

export default new TaskService()