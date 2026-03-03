import Router from 'express'

import { requireAuthentication } from '../middleware/auth.js'
import { createCSVDatasetUpload } from '../middleware/multer.js'
import { UsernamesController } from '../controllers/index.js'

const usernamesRouter = Router()

// Create multer object that uploads directly to /shared/data/plantList.csv
const uploadUsernames = createCSVDatasetUpload('usernames.csv')

/*
 * GET /api/usernames
 * Returns the current usernames.csv file
 * Authentication required
 */
usernamesRouter.get('/', requireAuthentication, UsernamesController.getUsernamesFile)

/*
 * POST /api/usernames
 * Replaces usernames.csv with an uploaded CSV file
 * Accepts a file input; authentication required
 */
usernamesRouter.post('/', requireAuthentication, uploadUsernames.single('file'), UsernamesController.uploadUsernamesFile)

export default usernamesRouter