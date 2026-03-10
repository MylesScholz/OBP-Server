import Router from 'express'

import { OAuthController } from '../controllers/index.js'

const oauthRouter = Router()

/*
 * GET /api/oauth/iNaturalist
 * Callback endpoint for the iNaturalist OAuth workflow; exchanges the given code for an access token
 */
oauthRouter.get('/iNaturalist', OAuthController.authorizeINaturalist)

/*
 * GET /api/oauth/iNaturalist/link
 * Redirects to the iNaturalist consent screen
 */
oauthRouter.get('/iNaturalist/link', OAuthController.redirectToINaturalist)

/*
 * GET /api/oauth/iNaturalist/status
 * Checks the status of the iNaturalist access token
 */
oauthRouter.get('/iNaturalist/status', OAuthController.getINaturalistStatus)

/*
 * GET /api/oauth/Google
 * Callback endpoint for the Google OAuth workflow; exchanges the given code for an access token
 */
oauthRouter.get('/Google', OAuthController.authorizeGoogle)

/*
 * GET /api/oauth/Google/link
 * Redirects to the Google consent screen
 */
oauthRouter.get('/Google/link', OAuthController.redirectToGoogle)

/*
 * GET /api/oauth/Google/status
 * Checks the status of the Google access token; refreshes if necessary
 */
oauthRouter.get('/Google/status', OAuthController.getGoogleStatus)

export default oauthRouter