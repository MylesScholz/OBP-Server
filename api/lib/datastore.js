import Crypto from 'node:crypto'

let datastore = {
    tasks: []
}

function createTask(type, dataset) {
    if (type !== 'observations' && type !== 'labels') {
        return {
            error: 'Invalid task field \'type\''
        }
    }

    const taskId = Crypto.randomUUID()
    datastore.tasks.push({
        id: taskId,
        type: type,
        dataset: dataset,
        status: 'Pending',
        createdAt: new Date().toISOString()
    })

    return {
        id: taskId
    }
}

function getTaskById(id) {
    return datastore.tasks.find((task) => task.id === id)
}

function getTasks() {
    return datastore.tasks
}

function setTaskProgress(id, progress) {
    const task = getTaskById(id)
    if (!task || !progress || !progress.currentStep) {
        return {
            error: 'Invalid task ID or progress object'
        }
    }

    task.status = 'Running'
    task.progress = progress

    return {
        id: id
    }
}

function setTaskResult(id, result) {
    const task = getTaskById(id)
    if (!task || !result || !result.uri) {
        return {
            error: 'Invalid task ID or result object'
        }
    }

    task.status = 'Completed'
    task.result = result
    task.completedAt = new Date().toISOString()

    return {
        id: id
    }
}

export { createTask, getTaskById, getTasks, setTaskProgress, setTaskResult }