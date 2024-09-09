import Crypto from 'node:crypto'
import multer from 'multer'

const fileTypes = {
    'text/csv': 'csv',
    'application/vnd.ms-excel': 'csv',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'csv'
}

const upload = multer({
    storage: multer.diskStorage({
        destination: `./api/data/uploads`,
        filename: (req, file, cb) => {
            const uniqueName = `${Crypto.randomUUID()}.${fileTypes[file.mimetype]}`
            cb(null, uniqueName)
        }
    }),
    fileFilter: (req, file, cb) => {
        cb(null, !!fileTypes[file.mimetype])
    }
})

export default upload