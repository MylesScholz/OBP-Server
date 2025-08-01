import bcryptjs from 'bcryptjs'
import jsonwebtoken from 'jsonwebtoken'

import { auth as authConfig } from '../config/environment.js'
import { auth as authConstants } from './constants.js'


/*
 * hashPassword()
 * Returns the hash of a given password
 */
function hashPassword(password) {
    return bcryptjs.hashSync(password, authConstants.saltLength)
}

/*
 * comparePasswordToHash()
 * Hashes and compares a given password to a given hash; returns true if matching
 */
function comparePasswordToHash(password, hash) {
    return !!bcryptjs.compareSync(password, hash)
}

/*
 * generateAuthToken()
 * Creates a JWT from a given admin ID using the server's secret key
 */
function generateAuthToken(adminId) {
    const payload = {
        sub: adminId
    }
    return jsonwebtoken.sign(payload, authConfig.jwtSecret, { expiresIn: '24h' })
}

/*
 * verifyJWT()
 * Checks if a given JWT is valid, and if so, returns the payload
 */
function verifyJWT(token) {
    try {
        return jsonwebtoken.verify(token, authConfig.jwtSecret)
    } catch (error) {
        return
    }
}

export { hashPassword, comparePasswordToHash, generateAuthToken, verifyJWT }