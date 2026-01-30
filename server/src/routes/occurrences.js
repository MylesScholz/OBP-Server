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
 * POST /api/occurrences/working/read
 * Read the current working occurrences dataset file into the database
 * Authentication required
 */
occurrencesRouter.post('/working/read', requireAuthentication, OccurrencesController.readWorkingFile)

/*
 * POST /api/occurrences/working/write
 * Overwrite the current working occurrences dataset file with the database occurrences
 * Authentication required
 */
occurrencesRouter.post('/working/write', requireAuthentication, OccurrencesController.writeWorkingFile)


/*
 * GET /api/occurrences/backup
 * Returns the current backup occurrence dataset file
 * Authentication required
 */
occurrencesRouter.get('/backup', requireAuthentication, OccurrencesController.getBackupFile)

/*
 * POST /api/occurrences/backup/read
 * Read the backup occurrences file into the working occurrences file
 * Authentication required
 */
occurrencesRouter.post('/backup/read', requireAuthentication, OccurrencesController.readBackupFile)

/*
 * POST /api/occurrences/backup/write
 * Overwrite the backup occurrences file with the current working occurrences file
 * Authentication required
 */
occurrencesRouter.post('/backup/write', requireAuthentication, OccurrencesController.writeBackupFile)

export default occurrencesRouter