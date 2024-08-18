import Crypto from 'node:crypto'
import multer from 'multer'

const fileTypes = {
    'text/csv': 'csv'
}

const upload = multer({
    storage: multer.diskStorage({
        destination: `./api/data/uploads`,
        filename: (req, file, cb) => {
            cb(null, `${Crypto.randomUUID()}.${fileTypes[file.mimetype]}`)
        }
    }),
    fileFilter: (req, file, cb) => {
        cb(null, !!fileTypes[file.mimetype])
    }
})

export default upload