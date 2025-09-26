import path from 'path'

import { DeterminationsService } from '../services/index.js'

export default class DeterminationsController {
    static async getDeterminationsFile(req, res, next) {
        // Write database determinations (if present) to determinations.csv
        await DeterminationsService.writeDeterminationsFromDatabase()
        // Send determinations.csv
        res.status(200).sendFile(path.resolve('./api/data/determinations.csv'))
    }

    static async uploadDeterminationsFile(req, res, next) {
        // Check that required field exists
        if (!req.file) {
            res.status(400).send({
                error: 'Missing required request field'
            })
            return
        }

        // Read determinations data from CSV into database
        await DeterminationsService.createDeterminationsFromFile()
        // Append determinations data from the upload file onto database determinations
        await DeterminationsService.upsertDeterminationsFromFile(path.join('./api/data/uploads/', req.file.filename))
        // Write database determinations to determinations.csv
        await DeterminationsService.writeDeterminationsFromDatabase()

        res.status(200).send()
    }
}