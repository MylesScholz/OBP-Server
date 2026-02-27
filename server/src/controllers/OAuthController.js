import axios from 'axios'

import { iNaturalist } from '../../shared/lib/config/environment.js'
import ApiService from '../../shared/lib/services/ApiService.js'

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

            ApiService.setINaturalistToken(access_token)

            res.redirect('/admin')
        } catch (error) {
            console.error('Error while exchanging token:', error.response?.data || error.message)
            // Forward to 500 code middleware
            next(error)
        }
    }

    static async authorizeGoogle(req, res, next) {

    }
}