import multer from 'multer'

const fileTypes = {
    'text/csv': 'csv'
}

const upload = multer({
    storage: multer.diskStorage({
        destination: `./api/uploads`,
        filename: (req, file, cb) => {
            cb(null, `dataset.${fileTypes[file.mimetype]}`)
        }
    }),
    fileFilter: (req, file, cb) => {
        cb(null, !!fileTypes[file.mimetype])
    }
})

export default upload