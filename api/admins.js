import Router from 'express'

import { generateAuthToken, requireAuthentication, validateCredentials, verifyJWT } from './lib/auth.js'
import { createAdmin, deleteAdminById, getAdminById, getAdmins } from './models/admin.js'

const adminsRouter = Router()

/*
 * GET /api/admins
 * Returns a list of all current admins; requires authentication
 */
adminsRouter.get('/', requireAuthentication, async (req, res, next) => {
    try {
        const admins = await getAdmins()
        res.status(200).send({
            admins
        })
    } catch (err) {
        // Forward to 500-code middleware
        next(err)
    }
})

/*
 * POST /api/admins
 * Creates a new admin with a given username and password; must be logged in as an admin
 * Requires:
 * - Valid JWT in the 'token' cookie
 * Outputs:
 * - The ID and username of the created admin
 */
adminsRouter.post('/', requireAuthentication, async (req, res, next) => {
    if (!req.body) {
        res.status(400).send({
            error: 'Missing required request field'
        })
        return
    }

    try {
        const { id: adminId } = await createAdmin(req.body.username, req.body.password)
        const admin = await getAdminById(adminId)

        res.status(201).send({
            id: adminId,
            username: admin.username
        })
    } catch (error) {
        res.status(400).send({
            error: error.message
        })
    }
})

/*
 * DELETE /api/admins/:id
 * Deletes a specific admin by ID, provided it is not the currently logged-in admin; requires authentication; returns the username of the deleted admin
 */
adminsRouter.delete('/:id', requireAuthentication, async (req, res, next) => {
    if (req.params.id === req.adminId) {
        res.status(403).send({
            error: 'Cannot delete the currently logged-in admin'
        })
        return
    }

    try {
        const admin = await getAdminById(req.params.id)
        const adminUsername = admin?.username
        const deleted = await deleteAdminById(req.params.id)

        if (deleted) {
            res.status(200).send({
                deletedUsername: adminUsername
            })
        } else {
            res.status(400).send()
        }
    } catch (err) {
        // Forward to 500-code middleware
        next(err)
    }
})

/*
 * GET /api/admins/login
 * Returns whether the request has a valid JWT
 */
adminsRouter.get('/login', async (req, res, next) => {
    if (!req.cookies.token) {
        res.status(200).send({ loggedIn: false })
    } else {
        const result = await verifyJWT(req.cookies.token)
        res.status(200).send(result)
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
        // Forward to 500-code middleware
        next(err)
    }
})

/*
 * POST /api/admins/logout
 * Removes a JWT stored in an Http-Only cookie if present
 */
adminsRouter.post('/logout', (req, res, next) => {
    res.clearCookie('token').status(200).send()
})

export default adminsRouter