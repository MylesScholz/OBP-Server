import Router from 'express'
import upload from './lib/multer.js'

const labelsRouter = Router()

labelsRouter.get('/', upload.single('file'), (req, res, next) => {
    if (req.file) {
        res.status(200).send("OK")
    } else {
        res.status(400).send({
            error: 'Missing required CSV file upload'
        })
    }
})

export default labelsRouter