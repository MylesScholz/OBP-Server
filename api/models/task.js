import { ObjectId } from 'mongodb'
import fs from 'fs'

import { getDb } from '../lib/mongo.js'

/*
 * clearTasks()
 * Deletes all tasks
 */
async function clearTasks() {
    const db = getDb()
    const collection = db.collection('tasks')

    // Delete all tasks
    collection.deleteMany({})
}

/*
 * clearTasksWithoutFiles()
 * Deletes all tasks with non-existent 'dataset' or 'result' files
 */
async function clearTasksWithoutFiles() {
    const db = getDb()
    const collection = db.collection('tasks')

    // Find tasks with missing files (dataset or result)
    const tasks = await collection.find({}).toArray()
    const taskIdsWithoutFiles = tasks
        .filter((t) => (t.status !== 'Completed' && !fs.existsSync(t.dataset)) || (t.result && t.result.outputs.some((o) => !fs.existsSync(`./api/data/${o.type}/${o.fileName}`))))
        .map((t) => t._id)

    // Delete tasks with missing files
    const { deletedCount } = await collection.deleteMany({ _id: { $in: taskIdsWithoutFiles } })
    // console.log(`Deleted ${deletedCount} files with missing data`)
}

/*
 * createTask()
 * Inserts a new task with the given properties
 */
async function createTask(type, dataset, sources, minDate, maxDate) {
    // Limit 'type' argument to either 'observations' or 'labels'
    if (type !== 'observations' && type !== 'labels' && type !== 'addresses' && type !== 'emails') {
        throw new Error('Invalid task field \'type\'')
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
    const taskTag = `${sourceString ? sourceString + '_' : ''}${createdAtDate}T${createdAtTime}`
    const task = {
        name: `${type}Task_${taskTag}`,
        tag: taskTag,
        type: type,
        dataset: dataset,
        status: 'Pending',
        createdAt: createdAt.toISOString()
    }
    // Optional task fields (only user for 'observations' tasks)
    if (sources) task.sources = sources
    if (minDate) task.minDate = minDate
    if (maxDate) task.maxDate = maxDate

    const db = getDb()
    const collection = db.collection('tasks')
    const result = await collection.insertOne(task)

    return {
        id: result.insertedId
    }
}

/*
 * getTasks()
 * Finds all tasks
 */
async function getTasks() {
    const db = getDb()
    const collection = db.collection('tasks')

    // Get all tasks
    const result = await collection.find({}).toArray()
    return result
}

/*
 * getTaskById()
 * Finds a specific task by its Mongo ID
 */
async function getTaskById(id) {
    const db = getDb()
    const collection = db.collection('tasks')

    // Check ID argument before attempting query
    if (!ObjectId.isValid(id)) {
        return
    } else {
        const result = await collection.findOne({ _id: new ObjectId(id) })
        return result
    }
}

/*
 * updateTaskInProgress()
 * Sends a progress update for an ongoing (unfinished) task
 */
async function updateTaskInProgress(id, progress) {
    const db = getDb()
    const collection = db.collection('tasks')

    // Check ID argument before attempting query
    if (!ObjectId.isValid(id)) {
        throw new Error('Invalid field \'id\'')
    } else {
        await collection.updateOne(
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
 * updateTaskWarning()
 * Sends a warning message for the given task
 */
async function updateTaskWarning(id, warning) {
    const db = getDb()
    const collection = db.collection('tasks')

    if (!ObjectId.isValid(id)) {
        throw new Error('Invalid field \'id\'')
    } else {
        await collection.updateOne(
            { _id: new ObjectId(id) },
            {
                $set: {
                    warning: warning
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
    const collection = db.collection('tasks')

    // Check ID argument before attempting query
    if (!ObjectId.isValid(id)) {
        throw new Error('Invalid field \'id\'')
    } else {
        await collection.updateOne(
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

/*
 * updateTaskFailure()
 * 'Ends' a task by marking it as failed and removing the 'progress' field
 */
async function updateTaskFailure(id) {
    const db = getDb()
    const collection = db.collection('tasks')

    // Check ID argument before attempting query
    if (!ObjectId.isValid(id)) {
        throw new Error('Invalid field \'id\'')
    } else {
        await collection.updateOne(
            { _id: new ObjectId(id) },
            {
                $set: {
                    status: 'Failed',
                    completedAt: new Date().toISOString()       // Current time
                },
                $unset: { progress: undefined }
            }
        )
    }
}

export { clearTasks, clearTasksWithoutFiles, createTask, getTaskById, getTasks, updateTaskInProgress, updateTaskWarning, updateTaskResult, updateTaskFailure }