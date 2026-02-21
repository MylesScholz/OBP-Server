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
}