import Router from 'express'
import path from 'path'

import { requireAuthentication } from './lib/auth.js'
import { uploadUsernames } from './lib/multer.js'

const usernamesRouter = Router()

/*
 * GET /api/usernames
 * Returns the current usernames.csv file; must be logged in as an admin
 * Requires:
 * - Valid JWT in the Authorization header
 * Outputs:
 * - usernames.csv
 */
usernamesRouter.get('/', requireAuthentication, (req, res, next) => {
    // Send usernames.csv
    res.status(200).sendFile(path.resolve('./api/data/usernames.csv'))
})

/*
 * POST /api/usernames
 * Replaces usernames.csv with an uploaded CSV file; must be logged in as an admin
 * Requires:
 * - Valid JWT in the Authorization header
 * - CSV file upload
 * Outputs:
 * - None
 */
usernamesRouter.post('/', requireAuthentication, uploadUsernames.single('file'), (req, res, next) => {
    // Check that required field exists
    if (!req.file) {
        res.status(400).send({
            error: 'Missing required request field'
        })
        return
    }

    res.status(200).send()
})

export default usernamesRouter