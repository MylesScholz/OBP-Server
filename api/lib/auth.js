import bcryptjs from 'bcryptjs'
import jsonwebtoken from 'jsonwebtoken'

import { getAdminByUsername } from '../models/admin.js'

const serverKey = process.env.SERVER_KEY

/*
 * validateCredentials()
 * Hashes and compares passwords for an admin given by its username
 */
async function validateCredentials(username, password) {
    const admin = await getAdminByUsername(username)
    return admin && bcryptjs.compareSync(password, admin.password) ? admin._id : null
}

/*
 * generateAuthToken()
 * Creates a JWT from a given admin ID using the server's secret key
 */
function generateAuthToken(adminId) {
    const payload = {
        sub: adminId
    }
    return jsonwebtoken.sign(payload, serverKey, { expiresIn: '24h' })
}

/*
 * requireAuthentication()
 * A middleware function that requires a valid JWT before proceeding
 */
async function requireAuthentication(req, res, next) {
    const authHeader = req.get('Authorization') || ''
    const authHeaderParts = authHeader.split(' ')
    const token = authHeaderParts[0] === 'Bearer' ? authHeaderParts[1] : null

    try {
        const payload = jsonwebtoken.verify(token, serverKey)
        req.adminId = payload.sub
        next()
    } catch (error) {
        res.status(401).send({
            error: 'Valid authentication token required'
        })
    }
}

export { validateCredentials, generateAuthToken, requireAuthentication }