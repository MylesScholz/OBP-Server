import Router from 'express'

import { requireAuthentication } from '../middleware/auth.js'
import { uploadPlantList } from '../middleware/multer.js'
import { PlantListController } from '../controllers/index.js'

const plantListRouter = Router()

/*
 * GET /api/plantList
 * Returns the current plantList.csv file
 * Authentication required
 */
plantListRouter.get('/', requireAuthentication, PlantListController.getPlantList)

/*
 * POST /api/plantList
 * Replaces plantList.csv with an uploaded CSV file
 * Accepts a file input; authentication required
 */
plantListRouter.post('/', requireAuthentication, uploadPlantList.single('file'), PlantListController.uploadPlantList)

export default plantListRouter