import { AdminService } from '../services/index.js'
import { InvalidArgumentError, ValidationError } from '../utils/errors.js'

export default class AdminController {
    /*
     * getAdmins()
     * Returns a list of all current admins
     */
    static async getAdmins(req, res, next) {
        try {
            const admins = await AdminService.getAdmins()
            res.status(200).send({
                admins
            })
        } catch (error) {
            // Forward to 500-code middleware
            next(error)
        }
    }

    /*
     * createAdmin()
     * Creates a new admin with a given username and password
     * Requires:
     * - req.body.username: an admin username
     * - req.body.password: an admin password
     * Outputs:
     * - The ID and username of the created admin
     */
    static async createAdmin(req, res, next) {
        if (!req.body || !req.body.username || !req.body.password) {
            res.status(400).send({
                error: 'Missing required request field'
            })
            return
        }

        try {
            const admin = await AdminService.createAdmin(req.body.username, req.body.password)

            res.status(201).send({
                id: admin._id,
                username: admin.username
            })
        } catch (error) {
            if (error instanceof InvalidArgumentError || error instanceof ValidationError) {
                res.status(400).send({
                    error: error.message
                })
            } else {
                // Forward to 500-code middleware
                next(error)
            }
        }
    }

    /*
     * deleteAdminById()
     * Deletes a specific admin by ID, provided it is not the currently logged-in admin; returns the username of the deleted admin
     */
    static async deleteAdminById(req, res, next) {
        if (req.params.id === req.adminId) {
            res.status(403).send({
                error: 'Cannot delete the currently logged-in admin'
            })
            return
        }

        try {
            const result = await AdminService.deleteAdminById(req.params.id)

            res.status(result.deleted ? 200 : 400).send(result)
        } catch (error) {
            // Forward to 500-code middleware
            next(error)
        }
    }

    /*
     * login()
     * Returns a signed JWT in a cookie if credentials are valid
     * Requires:
     * - req.body.username: an admin username
     * - req.body.password: an admin password
     * Outputs:
     * - A signed JWT
     */
    static async login(req, res, next) {
        if (!req.body || !req.body.username || !req.body.password) {
            res.status(400).send({
                error: 'Missing required request field'
            })
            return
        }

        try {
            const { valid, token } = await AdminService.validateCredentials(req.body.username, req.body.password)

            if (valid) {
                res.cookie('token', token, { httpOnly: true, sameSite: 'strict' }).status(200).send()
            } else {
                res.status(401).send({
                    error: 'Invalid credentials'
                })
            }
        } catch (error) {
            if (error instanceof InvalidArgumentError || error instanceof ValidationError) {
                res.status(400).send({
                    error: error.message
                })
            } else {
                // Forward to 500-code middleware
                next(error)
            }
        }
    }

    /*
     * checkLogin()
     * Returns whether the request has a valid JWT
     */
    static async checkLogin(req, res, next) {
        if (!req.cookies.token) {
            res.status(200).send({ loggedIn: false })
        } else {
            try {
                const result = await AdminService.verifyLogin(req.cookies.token)

                res.status(200).send(result)
            } catch (error) {
                if (error instanceof InvalidArgumentError || error instanceof ValidationError) {
                    res.status(400).send({
                        error: error.message
                    })
                } else {
                    // Forward to 500-code middleware
                    next(error)
                }
            }
        }
    }

    /*
     * logout()
     * Removes a JWT stored in an Http-Only cookie if present
     */
    static async logout(req, res, next) {
        res.clearCookie('token').status(200).send()
    }
}