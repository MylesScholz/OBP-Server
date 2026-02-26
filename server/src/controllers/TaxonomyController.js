import fs from 'fs'
import path from 'path'

import { TaxonomyService } from '../../shared/lib/services/index.js'

export default class TaxonomyController {
    /*
     * getOptions()
     * Validates a taxonomy given by query parameters and returns options for the next rank
     */
    static async getOptions(req, res, next) {
        const { family, genus, species, sex, caste } = req.query
        
        const taxonomyValidation = TaxonomyService.validateTaxonomy(family, genus, species)
        const sexCasteValidation = TaxonomyService.validateSexCaste(sex, caste)

        res.status(200).send({ taxonomy: taxonomyValidation, sexCaste: sexCasteValidation })
    }

    /*
     * getTaxonomyFile()
     * Statically serves a file from /shared/data/taxonomy/
     */
    static getTaxonomyFile(req, res, next) {
        const filePath = path.resolve(`./shared/data/taxonomy/${req.params.fileName}`)
        if (fs.existsSync(filePath)) {
            res.status(200).sendFile(filePath)
        } else {
            next()
        }
    }

    /*
     * uploadFile()
     * Updates the server's taxonomy from a given CSV upload
     * Requires req.file and req.body.type; req.body.type must equal 'taxonomy' or 'sexCaste'
     */
    static async uploadFile(req, res, next) {
        // Check that required fields exist
        if (!req.file || !req.body?.type) {
            res.status(400).send({
                error: 'Missing required request field'
            })
            return
        }
        // Check that req.body.type is valid
        const fileTypes = ['taxonomy', 'sexCaste']
        if (!fileTypes.includes(req.body?.type)) {
            res.status(400).send({
                error: 'Unknown file type provided'
            })
            return
        }

        try {
            let success = false
            if (req.body.type === 'taxonomy') {
                success = TaxonomyService.readTaxonomyCSV(`./shared/data/uploads/${req.file.filename}`)
            } else if (req.body.type === 'sexCaste') {
                success = TaxonomyService.readSexCasteCSV(`./shared/data/uploads/${req.file.filename}`)
            }

            res.status(200).send({
                success
            })
        } catch (error) {
            // Forward to 500-code middleware
            next(error)
        }
    }

    static getTaxonomyDownload(req, res, next) {
        const taxonomyResponse = TaxonomyService.writeTaxonomyCSV()
        const sexCasteResponse = TaxonomyService.writeSexCasteCSV()

        const output = { success: taxonomyResponse.success || sexCasteResponse.success }
        if (taxonomyResponse.success) {
            output.taxonomyFileName = taxonomyResponse.fileName
            output.taxonomyUri = taxonomyResponse.uri
        }
        if (sexCasteResponse.success) {
            output.sexCasteFileName = sexCasteResponse.fileName
            output.sexCasteUri = sexCasteResponse.uri
        }

        res.status(200).send(output)
    }
}