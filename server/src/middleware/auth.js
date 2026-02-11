import { AdminService } from '../../shared/lib/services/index.js'
import { InvalidArgumentError } from '../../shared/lib/utils/errors.js'

/*
 * requireAuthentication()
 * A middleware function that requires a valid JWT before proceeding
 */
async function requireAuthentication(req, res, next) {
    const token = req.cookies.token

    try {
        const { loggedIn, id } = await AdminService.verifyLogin(token)

        if (loggedIn) {
            req.adminId = id
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

/*
 * checkAuthentication()
 * A middleware function that checks for a valid JWT but does not require one
 */
async function checkAuthentication(req, res, next) {
    const token = req.cookies.token

    try {
        const { loggedIn, id } = await AdminService.verifyLogin(token)

        if (loggedIn) {
            req.adminId = id
        }

        next()
    } catch (error) {
        if (error instanceof InvalidArgumentError) {
            next()
        } else {
            next(error)
        }
    }
}

export { requireAuthentication, checkAuthentication }