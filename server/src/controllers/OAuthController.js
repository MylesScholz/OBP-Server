import path from 'path'
import axios from 'axios'

import { iNaturalist } from '../../shared/lib/config/environment.js'
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

            FileManager.writeJSON(path.resolve('./shared/data/iNaturalistToken.json'), { access_token: access_token ?? '' })

            res.redirect('/admin')
        } catch (error) {
            console.error('Error while exchanging token:', error.response?.data || error.message)
            // Forward to 500 code middleware
            next(error)
        }
    }

    static async authorizeGoogle(req, res, next) {

    }

    static async checkAuthorization(req, res, next) {
        const { access_token: iNaturalistToken } = FileManager.readJSON(path.resolve('./shared/data/iNaturalistToken.json'), { access_token: '' })
        const { access_token: GoogleToken } = FileManager.readJSON(path.resolve('./shared/data/GoogleToken.json'), { access_token: '' })

        res.status(200).send({
            iNaturalistAuthorization: !!iNaturalistToken,
            GoogleAuthorization: !!GoogleToken
        })
    }
}