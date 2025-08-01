import { AdminService } from '../services/index.js'

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

export { requireAuthentication }