import Router from 'express'
import fs from 'fs'

import { requireAuthentication } from '../middleware/auth.js'

const archiveRouter = Router()

function createReadDirMiddleware(directory, uriStem) {
    return (req, res, next) => {
        try {
            // Query directory for files
            const files = fs.readdirSync(directory)
                .map((f) => ({ fileName: f, uri: uriStem + f }))

            // Send zip file HATEOAS links
            res.status(200).send({
                files
            })
        } catch (err) {
            // Forward to 500-code middleware
            next(err)
        }
    }
}

archiveRouter.get('/addresses', requireAuthentication, createReadDirMiddleware('./api/data/addresses', '/api/addresses/'))

archiveRouter.get('/duplicates', requireAuthentication, createReadDirMiddleware('./api/data/duplicates', '/api/duplicates/'))

archiveRouter.get('/emails', requireAuthentication, createReadDirMiddleware('./api/data/emails', '/api/emails/'))

archiveRouter.get('/flags', requireAuthentication, createReadDirMiddleware('./api/data/flags', '/api/flags/'))

archiveRouter.get('/labels', requireAuthentication, createReadDirMiddleware('./api/data/labels', '/api/labels/'))

archiveRouter.get('/observations', requireAuthentication, createReadDirMiddleware('./api/data/observations', '/api/observations/'))

archiveRouter.get('/occurrences', requireAuthentication, createReadDirMiddleware('./api/data/occurrences', '/api/occurrences/'))

archiveRouter.get('/pivots', requireAuthentication, createReadDirMiddleware('./api/data/pivots', '/api/pivots/'))

archiveRouter.get('/pulls', requireAuthentication, createReadDirMiddleware('./api/data/pulls', '/api/pulls/'))

archiveRouter.get('/reports', requireAuthentication, createReadDirMiddleware('./api/data/reports', '/api/reports/'))

archiveRouter.get('/uploads', requireAuthentication, createReadDirMiddleware('./api/data/uploads', '/api/uploads/'))

export default archiveRouter