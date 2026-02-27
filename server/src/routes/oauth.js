import Router from 'express'

import { OAuthController } from '../controllers/index.js'

const oauthRouter = Router()

/*
 * GET /api/oauth/iNaturalist
 * Callback endpoint for the iNaturalist OAuth workflow; exchanges the given code for an access token
 */
oauthRouter.get('/iNaturalist', OAuthController.authorizeINaturalist)

export default oauthRouter