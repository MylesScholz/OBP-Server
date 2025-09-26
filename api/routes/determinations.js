import Router from 'express'

import { requireAuthentication } from '../middleware/auth.js'
import { uploadDeterminations } from '../middleware/multer.js'
import { DeterminationsController } from '../controllers/index.js'

const determinationsRouter = Router()

/*
 * GET /api/determinations
 * Returns the current determinations.csv file
 * Authentication required
 */
determinationsRouter.get('/', requireAuthentication, DeterminationsController.getDeterminationsFile)

/*
 * POST /api/determinations
 * Adds to determinations.csv with an uploaded CSV file
 * Accepts a file input; authentication required
 */
determinationsRouter.post('/', requireAuthentication, uploadDeterminations.single('file'), DeterminationsController.uploadDeterminationsFile)

export default determinationsRouter