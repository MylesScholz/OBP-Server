import Router from 'express'
import fs from 'fs'

import { requireAuthentication } from './lib/auth.js'

const archiveRouter = Router()

function createReadDirMiddleware(directory, uriStem) {
    return (req, res, next) => {
        try {
            // Query directory for zip files
            const zipFiles = fs.readdirSync(directory)
                .filter((f) => f.toLowerCase().endsWith('.zip'))
                .map((f) => uriStem + f)

            // Send zip file HATEOAS links
            res.status(200).send({
                files: zipFiles
            })
        } catch (err) {
            // Forward to 500-code middleware
            next(err)
        }
    }
}

archiveRouter.get('/uploads', requireAuthentication, createReadDirMiddleware('./api/data/uploads', '/api/uploads/'))

archiveRouter.get('/observations', requireAuthentication, createReadDirMiddleware('./api/data/observations', '/api/observations/'))

archiveRouter.get('/labels', requireAuthentication, createReadDirMiddleware('./api/data/labels', '/api/labels/'))

export default archiveRouter