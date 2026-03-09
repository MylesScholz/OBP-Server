import path from 'path'
import axios from 'axios'
import { google } from 'googleapis'

import { iNaturalist } from '../../shared/lib/config/environment.js'
import { encryptObject, decryptObject } from '../../shared/lib/utils/utilities.js'
import FileManager from '../../shared/lib/utils/FileManager.js'

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

    static async authorizeGoogle(req, res, next) {
        const { code, error } = req.query

        // Handle user denial or errors
        if (error || !code) {
            return res.status(400).send({
                error: `Authorization failed: ${error || 'No code received'}`
            })
        }

        try {
            const encryptedCredentials = FileManager.readJSON(path.resolve('./shared/data/credentials.json'))
            const credentials = decryptObject(encryptedCredentials)
            const { client_id, client_secret, redirect_uris } = credentials.web

            const GoogleOAuthClient = new google.auth.OAuth2(
                client_id,
                client_secret,
                redirect_uris[0]
            )

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
        const encryptedCredentials = FileManager.readJSON(path.resolve('./shared/data/credentials.json'))
        const credentials = decryptObject(encryptedCredentials)
        const { client_id, client_secret, redirect_uris } = credentials.web

        const GoogleOAuthClient = new google.auth.OAuth2(
            client_id,
            client_secret,
            redirect_uris[0]
        )

        const GoogleAuthUrl = GoogleOAuthClient.generateAuthUrl({
            access_type: 'offline',     // Includes a refresh token in response
            scope: [ 'https://www.googleapis.com/auth/drive.file' ],
            prompt: 'consent'   // Forces refresh token every time (for development)
        })

        res.redirect(GoogleAuthUrl)
    }

    static async checkAuthorization(req, res, next) {
        const { encryptedToken: iNaturalistToken } = FileManager.readJSON(path.resolve('./shared/data/iNaturalistToken.json'), { encryptedToken: {} })
        const { encryptedToken: GoogleToken } = FileManager.readJSON(path.resolve('./shared/data/GoogleToken.json'), { encryptedToken: {} })

        res.status(200).send({
            iNaturalistAuthorization: !!iNaturalistToken,
            GoogleAuthorization: !!GoogleToken
        })
    }
}