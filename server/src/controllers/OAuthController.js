import path from 'path'
import axios from 'axios'
import { google } from 'googleapis'

import { iNaturalist } from '../../shared/lib/config/environment.js'
import { encryptObject, decryptObject } from '../../shared/lib/utils/utilities.js'
import FileManager from '../../shared/lib/utils/FileManager.js'

const encryptedCredentials = FileManager.readJSON(path.resolve('./shared/data/credentials.json'))
const credentials = decryptObject(encryptedCredentials)
const { client_id, client_secret, redirect_uris } = credentials?.web ?? {}

function createGoogleOAuthClient() {
    return new google.auth.OAuth2(
        client_id,
        client_secret,
        redirect_uris[0]
    )
}

export default class OAuthController {
    static async authorizeINaturalist(req, res, next) {
        const { code, error } = req.query

        // Handle user denial or errors
        if (error || !code) {
            return res.status(400).send({
                error: `Authorization failed: ${error || 'No code received'}`
            })
        }

        try {
            // Exchange code for access token
            const tokenResponse = await axios.post('https://www.inaturalist.org/oauth/token', {
                client_id: iNaturalist.clientId,
                client_secret: iNaturalist.clientSecret,
                code: code,
                redirect_uri: iNaturalist.redirectUrl,
                grant_type: 'authorization_code'
            })

            const { access_token } = tokenResponse.data
            const encryptedToken = encryptObject(access_token)

            FileManager.writeJSON(path.resolve('./shared/data/iNaturalistToken.json'), { encryptedToken: encryptedToken ?? {} })

            res.redirect('/admin')
        } catch (error) {
            console.error('Error while exchanging token:', error.response?.data || error.message)
            // Forward to 500 code middleware
            next(error)
        }
    }

    static async redirectToINaturalist(req, res, next) {
        const iNaturalistAuthBaseUrl = 'https://www.inaturalist.org'
        const iNaturalistClientId = iNaturalist.clientId ?? ''
        const iNaturalistRedirectUri = iNaturalist.redirectUrl ?? ''
        const iNaturalistAuthUrl = `${iNaturalistAuthBaseUrl}/oauth/authorize?client_id=${iNaturalistClientId}&redirect_uri=${iNaturalistRedirectUri}&response_type=code`

        res.redirect(iNaturalistAuthUrl)
    }

    static async getINaturalistStatus(req, res, next) {
        const { encryptedToken: iNaturalistToken } = FileManager.readJSON(path.resolve('./shared/data/iNaturalistToken.json'), { encryptedToken: {} })

        res.status(200).send({
            authorized: !!iNaturalistToken
        })
    }

    static async authorizeGoogle(req, res, next) {
        const { code, error } = req.query

        // Handle user denial or errors
        if (error || !code) {
            return res.status(400).send({
                error: `Authorization failed: ${error || 'No code received'}`
            })
        }

        try {
            const GoogleOAuthClient = createGoogleOAuthClient()

            const tokens = await GoogleOAuthClient.getToken(code)
            const encryptedTokens = encryptObject(tokens)

            FileManager.writeJSON(path.resolve('./shared/data/GoogleToken.json'), { encryptedToken: encryptedTokens ?? {} })

            res.redirect('/admin')
        } catch (error) {
            console.error('Error while exchanging token:', error.response?.data || error.message)
            // Forward to 500 code middleware
            next(error)
        }
    }

    static async redirectToGoogle(req, res, next) {
        const GoogleOAuthClient = createGoogleOAuthClient()

        const GoogleAuthUrl = GoogleOAuthClient.generateAuthUrl({
            access_type: 'offline',     // Includes a refresh token in response
            scope: [ 'https://www.googleapis.com/auth/drive.file' ],
            prompt: 'consent'   // Forces refresh token every time (for development)
        })

        res.redirect(GoogleAuthUrl)
    }

    static async getGoogleStatus(req, res, next) {
        const { encryptedToken } = FileManager.readJSON(path.resolve('./shared/data/GoogleToken.json'), { encryptedToken: {} })
        const tokens = decryptObject(encryptedToken)

        // No token
        if (!tokens) {
            res.status(200).send({ authorized: false })
            return
        }

        // No refresh token (should be persistent)
        if (!tokens.refresh_token) {
            FileManager.writeJSON(path.resolve('./shared/data/GoogleToken.json'), { encryptedToken: {} })
            res.status(200).send({ authorized: false })
        }

        try {
            const GoogleOAuthClient = createGoogleOAuthClient()
            GoogleOAuthClient.setCredentials(tokens)

            const tokenInfo = GoogleOAuthClient.getTokenInfo(tokens.access_token)

            // Insufficient scopes
            const requiredScopes = [ 'https://www.googleapis.com/auth/drive.file' ]
            if (!requiredScopes.every((scope) => tokenInfo.scopes.includes(scope))) {
                FileManager.writeJSON(path.resolve('./shared/data/GoogleToken.json'), { encryptedToken: {} })
                res.status(200).send({ authorized: false })
            }

            res.status(200).send({ authorized: true })
        } catch (error) {
            // access_token is invalid; try refreshing
            try {
                const GoogleOAuthClient = createGoogleOAuthClient()
                GoogleOAuthClient.setCredentials(tokens)

                const { credentials } = GoogleOAuthClient.refreshAccessToken()
                const newTokens = { ...tokens, ...credentials }
                FileManager.writeJSON(path.resolve('./shared/data/GoogleToken.json'), { encryptedToken: newTokens })

                res.status(200).send({ authorized: true })
            } catch (refreshError) {
                // Refresh token is also invalid; must redo OAuth
                FileManager.writeJSON(path.resolve('./shared/data/GoogleToken.json'), { encryptedToken: {} })
                res.status(200).send({ authorized: false })
            }
        }
    }
}