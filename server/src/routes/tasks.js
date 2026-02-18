import Router from 'express'

import { TaskController } from '../controllers/index.js'
import { limitUploadFiles, uploadCSV } from '../middleware/multer.js'
import { checkAuthentication } from '../middleware/auth.js'

const tasksRouter = Router()

/*
 * POST /api/tasks/
 * Creates a task with a given subtask pipeline
 * Accepts a file input
 */
tasksRouter.post('/', checkAuthentication, uploadCSV.single('file'), limitUploadFiles, TaskController.createTask)

/*
 * GET /api/tasks
 * Returns a list of all current and previous tasks stored on the Mongo server
 */
tasksRouter.get('/', checkAuthentication, TaskController.getTasks)

/*
 * GET /api/tasks/:id
 * Returns a current or previous task on the Mongo server, referenced by ID
 */
tasksRouter.get('/:id', checkAuthentication, TaskController.getTaskById)

export default tasksRouter