import Crypto from 'node:crypto'
import multer from 'multer'

// Allowable file types; keys are MIME file types, values are file extensions
const fileTypes = {
    'text/csv': 'csv',
    'application/vnd.ms-excel': 'csv',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'csv'
}

// Multer object for processing uploads; only allows CSV files and assigns a random, unique file name
const upload = multer({
    storage: multer.diskStorage({
        destination: `./api/data/uploads`,
        filename: (req, file, cb) => {
            // Create a unique file name
            const uniqueName = `${Crypto.randomUUID()}.${fileTypes[file.mimetype]}`
            cb(null, uniqueName)
        }
    }),
    fileFilter: (req, file, cb) => {
        cb(null, !!fileTypes[file.mimetype])
    }
})

export default upload