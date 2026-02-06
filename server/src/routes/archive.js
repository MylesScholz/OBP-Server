import Router from 'express'
import fs from 'fs'

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

archiveRouter.get('/addresses', createReadDirMiddleware('./shared/data/addresses', '/api/addresses/'))

archiveRouter.get('/backups', createReadDirMiddleware('./shared/data/backups', '/api/backups/'))

archiveRouter.get('/duplicates', createReadDirMiddleware('./shared/data/duplicates', '/api/duplicates/'))

archiveRouter.get('/emails', createReadDirMiddleware('./shared/data/emails', '/api/emails/'))

archiveRouter.get('/flags', createReadDirMiddleware('./shared/data/flags', '/api/flags/'))

archiveRouter.get('/labels', createReadDirMiddleware('./shared/data/labels', '/api/labels/'))

archiveRouter.get('/observations', createReadDirMiddleware('./shared/data/observations', '/api/observations/'))

archiveRouter.get('/occurrences', createReadDirMiddleware('./shared/data/occurrences', '/api/occurrences/'))

archiveRouter.get('/pivots', createReadDirMiddleware('./shared/data/pivots', '/api/pivots/'))

archiveRouter.get('/pulls', createReadDirMiddleware('./shared/data/pulls', '/api/pulls/'))

archiveRouter.get('/reports', createReadDirMiddleware('./shared/data/reports', '/api/reports/'))

archiveRouter.get('/uploads', createReadDirMiddleware('./shared/data/uploads', '/api/uploads/'))

export default archiveRouter