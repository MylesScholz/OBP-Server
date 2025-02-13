import Router from 'express'

import { generateAuthToken, requireAuthentication, validateCredentials, verifyJWT } from './lib/auth.js'
import { createAdmin } from './models/admin.js'

const adminsRouter = Router()

/*
 * POST /api/admins
 * Creates a new admin with a given username and password; must be logged in as an admin
 * Requires:
 * - Valid JWT in the Authorization header
 * Outputs:
 * - The ID of the created admin
 */
adminsRouter.post('/', requireAuthentication, async (req, res, next) => {
    if (!req.body) {
        res.status(400).send({
            error: 'Missing required request field'
        })
    }

    try {
        const adminId = await createAdmin(req.body.username, req.body.password)

        res.status(201).send({
            id: adminId
        })
    } catch (error) {
        res.status(400).send({
            error: error.message
        })
    }
})

/*
 * GET /api/admins/login
 * Returns whether the request has a valid JWT
 * Requires:
 * - None
 * Output:
 * - Boolean of whether the request has a valid JWT
 */
adminsRouter.get('/login', async (req, res, next) => {
    if (!req.cookies.token) {
        res.status(200).send({ loggedIn: false })
    } else {
        const loggedIn = await verifyJWT(req.cookies.token)
        res.status(200).send({ loggedIn: loggedIn })
    }
})

/*
 * POST /api/admins/login
 * The authentication endpoint for admins; returns a signed JWT in a cookie if credentials are valid
 * Requires:
 * - req.body.username: an admin username
 * - req.body.password: an admin password
 * Outputs:
 * - A signed JWT
 */
adminsRouter.post('/login', async (req, res, next) => {
    if (!req.body || !req.body.username || !req.body.password) {
        res.status(400).send({
            error: 'Missing required request field'
        })
        return
    }

    try {
        const adminId = await validateCredentials(req.body.username, req.body.password)

        if (adminId) {
            const token = generateAuthToken(adminId)

            res.cookie('token', token, { httpOnly: true, sameSite: 'strict' }).status(200).send()
        } else {
            res.status(401).send({
                error: 'Invalid credentials'
            })
        }
    } catch (err) {
        next(err)
    }
})

/*
 * POST /api/admins/logout
 * Removes a JWT stored in an Http-Only cookie if present
 * Requires:
 * - None
 * Output:
 * - Removes the 'token' cookie
 */
adminsRouter.post('/logout', (req, res, next) => {
    if (!req.cookies.token) {
        res.status(200).send()
    } else {
        res.clearCookie('token').status(200).send()
    }
})

export default adminsRouter