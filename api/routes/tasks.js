import Router from 'express'

import { TaskController } from '../controllers/index.js'
import { limitUploadFiles, uploadCSV } from '../middleware/multer.js'
import { requireAuthentication } from '../middleware/auth.js'

const tasksRouter = Router()

/*
 * POST /api/tasks/observations
 * Creates a task to fetch data updates from iNaturalist.org and merge them into a provided dataset
 * Accepts a file input
 */
tasksRouter.post('/observations', uploadCSV.single('file'), limitUploadFiles, TaskController.createObservationsTask)

/*
 * POST /api/tasks/labels
 * Creates a task to create a PDF document of bee labels from a provided occurrence dataset
 * Accepts a file input
 */
tasksRouter.post('/labels', uploadCSV.single('file'), limitUploadFiles, TaskController.createLabelsTask)

/*
 * POST /api/tasks/addresses
 * Creates a task to compile a list of user addresses for printable labels
 * Accepts a file input; authentication required
 */
tasksRouter.post('/addresses', requireAuthentication, uploadCSV.single('file'), limitUploadFiles, TaskController.createAddressesTask)

/*
 * POST /api/tasks/emails
 * Creates a task to compile a list of user email addresses for error notifications
 * Accepts a file input; authentication required
 */
tasksRouter.post('/emails', requireAuthentication, uploadCSV.single('file'), limitUploadFiles, TaskController.createEmailsTask)

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