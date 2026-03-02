import Router from 'express'

import { OAuthController } from '../controllers/index.js'

const oauthRouter = Router()

/*
 * GET /api/oauth/iNaturalist
 * Callback endpoint for the iNaturalist OAuth workflow; exchanges the given code for an access token
 */
oauthRouter.get('/iNaturalist', OAuthController.authorizeINaturalist)

/*
 * GET /api/oauth/Google
 * Callback endpoint for the Google OAuth workflow; exchanges the given code for an access token
 */
oauthRouter.get('/Google', OAuthController.authorizeGoogle)

/*
 * GET /api/oauth/check
 * Checks for an existing access token for each service; returns a flag for each
 */
oauthRouter.get('/check', OAuthController.checkAuthorization)

export default oauthRouter