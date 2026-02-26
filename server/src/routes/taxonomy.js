import Router from 'express'

import { requireAuthentication } from '../middleware/auth.js'
import { uploadCSV } from '../middleware/multer.js'
import { TaxonomyController } from '../controllers/index.js'

const taxonomyRouter = Router()

/*
 * GET /api/taxonomy
 * Validates a taxonomy given by query parameters and returns options for the next rank
 */
taxonomyRouter.get('/', TaxonomyController.getOptions)

/*
 * GET /api/taxonomy/:fileName
 * Statically serves files by name
 */
taxonomyRouter.get('/:fileName', TaxonomyController.getTaxonomyFile)

/*
 * POST /api/taxonomy
 * Updates the server's taxonomy from a given CSV upload
 * Authentication required
 */
taxonomyRouter.post('/', requireAuthentication, uploadCSV.single('file'), TaxonomyController.uploadFile)

/*
 * GET /api/taxonomy/download
 * Returns flattened CSV files of the bee taxonomy and sex-caste hierarchy
 */
taxonomyRouter.get('/download', TaxonomyController.getTaxonomyDownload)

export default taxonomyRouter