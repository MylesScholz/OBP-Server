import { ObjectId } from "mongodb"
import { getDb } from "../lib/mongo.js"

async function clearTasks() {
    const db = getDb()
    const tasks = db.collection('tasks')
    // Delete all tasks
    tasks.deleteMany({})
}

async function createTask(type, dataset, sources, minDate, maxDate) {
    // Limit 'type' argument to either 'observations' or 'labels'
    if (type !== 'observations' && type !== 'labels') {
        throw new Error('Invalid task field \'type\'')
    }

    const task = {
        type: type,
        dataset: dataset,
        status: 'Pending',
        createdAt: new Date().toISOString()     // Current time
    }
    // Optional task fields (only user for 'observations' tasks)
    if (sources) task.sources = sources
    if (minDate) task.minDate = minDate
    if (maxDate) task.maxDate = maxDate

    const db = getDb()
    const tasks = db.collection('tasks')
    const result = await tasks.insertOne(task)

    return {
        id: result.insertedId
    }
}

async function getTaskById(id) {
    const db = getDb()
    const tasks = db.collection('tasks')

    // Check ID argument before attempting query
    if (!ObjectId.isValid(id)) {
        throw new Error('Invalid field \'id\'')
    } else {
        const result = await tasks.findOne({ _id: new ObjectId(id) })
        return result
    }
}

async function getTasks() {
    const db = getDb()
    const tasks = db.collection('tasks')

    // Get all tasks
    const result = await tasks.find({}).toArray()
    return result
}

/*
 * updateTaskInProgress()
 * Sends a progress update for an ongoing (unfinished) task
 */
async function updateTaskInProgress(id, progress) {
    const db = getDb()
    const tasks = db.collection('tasks')

    // Check ID argument before attempting query
    if (!ObjectId.isValid(id)) {
        throw new Error('Invalid field \'id\'')
    } else {
        await tasks.updateOne(
            { _id: new ObjectId(id) },
            {
                $set: {
                    status: 'Running',
                    progress: progress
                }
            }
        )
    }
}

/*
 * updateTaskResult()
 * 'Ends' a task by providing a result and removing the 'progress' field
 */
async function updateTaskResult(id, result) {
    const db = getDb()
    const tasks = db.collection('tasks')

    // Check ID argument before attempting query
    if (!ObjectId.isValid(id)) {
        throw new Error('Invalid field \'id\'')
    } else {
        await tasks.updateOne(
            { _id: new ObjectId(id) },
            {
                $set: {
                    status: 'Completed',
                    result: result,
                    completedAt: new Date().toISOString()       // Current time
                },
                $unset: { progress: undefined }
            }
        )
    }
}

export { clearTasks, createTask, getTaskById, getTasks, updateTaskInProgress, updateTaskResult }