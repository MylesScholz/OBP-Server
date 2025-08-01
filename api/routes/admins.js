import Router from 'express'

import { requireAuthentication } from '../middleware/auth.js'
import { AdminController } from '../controllers/index.js'

const adminsRouter = Router()

/*
 * GET /api/admins
 * Returns a list of all current admins
 * Authentication required
 */
adminsRouter.get('/', requireAuthentication, AdminController.getAdmins)

/*
 * POST /api/admins
 * Creates a new admin with a given username and password
 * Authentication required
 */
adminsRouter.post('/', requireAuthentication, AdminController.createAdmin)

/*
 * DELETE /api/admins/:id
 * Deletes a specific admin by ID, provided it is not the currently logged-in admin; returns the username of the deleted admin
 * Authentication required
 */
adminsRouter.delete('/:id', requireAuthentication, AdminController.deleteAdminById)

/*
 * GET /api/admins/login
 * Returns whether the request has a valid JWT
 */
adminsRouter.get('/login', AdminController.checkLogin)

/*
 * POST /api/admins/login
 * The authentication endpoint for admins; returns a signed JWT in a cookie if credentials are valid
 */
adminsRouter.post('/login', AdminController.login)

/*
 * POST /api/admins/logout
 * Removes a JWT stored in an Http-Only cookie if present
 */
adminsRouter.post('/logout', AdminController.logout)

export default adminsRouter