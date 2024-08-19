import { ObjectId } from "mongodb"
import { getDb } from "../lib/mongo.js"

async function createTask(type, dataset) {
    if (type !== 'observations' && type !== 'labels') {
        throw new Error('Invalid task field \'type\'')
    }

    const task = {
        type: type,
        dataset: dataset,
        status: 'Pending',
        createdAt: new Date().toISOString()
    }

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

    const result = await tasks.find({}).toArray()
    return result
}

export { createTask, getTaskById, getTasks }