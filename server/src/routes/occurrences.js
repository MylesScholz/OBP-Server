import Router from 'express'

import { requireAuthentication } from '../middleware/auth.js'
import { uploadCSV } from '../middleware/multer.js'
import { OccurrencesController } from '../controllers/index.js'

const occurrencesRouter = Router()

/*
 * GET /api/occurrences
 * Returns a page of occurrences from the working dataset matching the given query parameters
 * Authentication required for full functionality
 */
occurrencesRouter.get('/', OccurrencesController.getOccurrencesPage)

/*
 * POST /api/occurrences
 * Inserts a given list of occurrences into the working dataset
 * Authentication required for full functionality
 */
occurrencesRouter.post('/', uploadCSV.single('file'), OccurrencesController.uploadOccurrences)

/*
 * GET /api/occurrences/download
 * Returns a file containing occurrences from the working dataset matching the given query parameters
 * Authentication required for full functionality
 */
occurrencesRouter.get('/download', OccurrencesController.getOccurrencesDownload)

/*
 * GET /api/occurrences/working
 * Returns the current working occurrence dataset file
 * Authentication required
 */
occurrencesRouter.get('/working', requireAuthentication, OccurrencesController.getWorkingFile)

/*
 * GET /api/occurrences/backup
 * Returns the current backup occurrence dataset file
 * Authentication required
 */
occurrencesRouter.get('/backup', requireAuthentication, OccurrencesController.getBackupFile)

/*
 * GET /api/occurrences/sync
 * Returns the subset of the current working occurrence dataset that has been changed since last sync
 * Authentication required
 */
occurrencesRouter.get('/sync', requireAuthentication, (req, res, next) => { next() })

/*
 * POST /api/occurrences/sync
 * Syncs the current working occurrence dataset with the backup dataset
 * Authentication required
 */
occurrencesRouter.post('/sync', requireAuthentication, OccurrencesController.syncOccurrenceFiles)

export default occurrencesRouter