import bcryptjs from 'bcryptjs'
import jsonwebtoken from 'jsonwebtoken'

import { getAdminById, getAdminByUsername } from '../models/admin.js'

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
 * verifyJWT()
 * Returns a boolean of whether the given JWT is valid and the corresponding username if it is valid
 */
async function verifyJWT(token) {
    try {
        const payload = jsonwebtoken.verify(token, serverKey)
        const adminId = payload.sub
        const admin = await getAdminById(adminId)

        if (admin) {
            return { loggedIn: true, username: admin.username }
        } else {
            return { loggedIn: false }
        }
    } catch (error) {
        return false
    }
}

/*
 * requireAuthentication()
 * A middleware function that requires a valid JWT before proceeding
 */
async function requireAuthentication(req, res, next) {
    const token = req.cookies.token

    try {
        const payload = jsonwebtoken.verify(token, serverKey)
        const adminId = payload.sub
        const admin = await getAdminById(adminId)

        if (admin) {
            req.adminId = adminId
            next()
        } else {
            res.status(401).send({
                error: 'Valid authentication token required'
            })
        }
    } catch (error) {
        res.status(401).send({
            error: 'Valid authentication token required'
        })
    }
}

export { validateCredentials, generateAuthToken, verifyJWT, requireAuthentication }