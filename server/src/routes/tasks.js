import Router from 'express'

import { TaskController } from '../controllers/index.js'
import { limitUploadFiles, uploadCSV } from '../middleware/multer.js'

const tasksRouter = Router()

/*
 * POST /api/tasks/
 * Creates a task with a given subtask pipeline
 * Accepts a file input
 */
tasksRouter.post('/', uploadCSV.single('file'), limitUploadFiles, TaskController.createTask)

/*
 * GET /api/tasks
 * Returns a list of all current and previous tasks stored on the Mongo server
 */
tasksRouter.get('/', TaskController.getTasks)

/*
 * GET /api/tasks/:id
 * Returns a current or previous task on the Mongo server, referenced by ID
 */
tasksRouter.get('/:id', TaskController.getTaskById)

export default tasksRouter