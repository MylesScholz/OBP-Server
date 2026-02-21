import FileManager from '../utils/FileManager.js'

class TaxonomyService {
    constructor() {
        this.taxonomyFilePath = './shared/data/beeTaxonomy.json'
        this.sexCasteFilePath = './shared/data/sexCaste.json'
        this.taxonomy = {}
        this.sexCaste = {}

        this.readTaxonomy()
        this.readSexCaste()
    }

    /*
     * readTaxonomy()
     * Reads and parses beeTaxonomy.json; updates this.taxonomy
     */
    readTaxonomy() {
        const data = FileManager.readJSON(this.taxonomyFilePath, this.taxonomy)

        if (data) {
            this.taxonomy = data
            return data
        }
    }

    /*
     * readTaxonomyCSV()
     * Reads and parses a given CSV file into this.taxonomy; writes to beeTaxonomy.json
     */
    readTaxonomyCSV(filePath) {
        const data = FileManager.readCSV(filePath)
        let success = false

        // If data was read, convert from field-value form to hierarchy form (and update this.taxonomy)
        if (data?.length > 0) {
            const taxonomy = {}

            for (const row of data) {
                const { family, genus, species } = row

                // Ignore rows with no family or a species but no genus
                if (!family || (species && !genus)) continue

                // Initialize family and genus layers
                if (!taxonomy[family]) taxonomy[family] = {}
                if (genus && !taxonomy[family][genus]) taxonomy[family][genus] = []

                // Add species if defined
                if (species) taxonomy[family][genus].push(species)
            }

            // Only update this.taxonomy if a valid taxonomy was parsed
            if (Object.keys(taxonomy).length > 0) {
                this.taxonomy = taxonomy
                success = true
            }
        }

        // Write updates to taxonomy.json
        success &&= this.writeTaxonomy()
        return success
    }

    /*
     * writeTaxonomy()
     * Writes given taxonomy data to taxonomy.json; if no data provided, writes this.taxonomy
     */
    writeTaxonomy(taxonomy) {
        const data = taxonomy || this.taxonomy
        const success = FileManager.writeJSON(this.taxonomyFilePath, data)

        // If wrote successfully, update this.taxonomy
        if (success) this.taxonomy = data

        return success
    }

    /*
     * readSexCaste()
     * Reads and parses sexCaste.json; updates this.sexCaste
     */
    readSexCaste() {
        const data = FileManager.readJSON(this.sexCasteFilePath, this.sexCaste)

        if (data) {
            this.sexCaste = data
            return data
        }
    }

    /*
     * readSexCasteCSV()
     * Reads and parses a given CSV file into this.sexCaste; writes to sexCaste.json
     */
    readSexCasteCSV(filePath) {
        const data = FileManager.readCSV(filePath)
        let success = false

        // If data was read, convert from field-value form to lookup table form (and update this.sexCaste)
        if (data?.length > 0) {
            const sexCaste = {}

            for (const row of data) {
                const { sex, caste } = row

                // Ignore rows with no sex
                if (!sex) continue

                // Initialize caste list
                if (!sexCaste[sex]) sexCaste[sex] = []

                // Add caste if defined
                if (caste) sexCaste[sex].push(caste)
            }

            // Only update this.sexCaste if a values were parsed
            if (Object.keys(sexCaste).length > 0) {
                this.sexCaste = sexCaste
                success = true
            }
        }

        // Write updates to sexCaste.json
        success &&= this.writeSexCaste()
        return success
    }

    /*
     * writeSexCaste()
     * Writes given sex-caste data to sexCaste.json; if no data provided, writes this.sexCaste
     */
    writeSexCaste(sexCaste) {
        const data = sexCaste || this.sexCaste
        const success = FileManager.writeJSON(this.sexCasteFilePath, data)

        // If wrote successfully, update this.sexCaste
        if (success) this.sexCaste = data

        return success
    }

    /*
     * validateTaxonomy()
     * Checks that a given combination of family, genus, and species is valid
     * Returns an error, options for the next unspecified level, and a validity flag
     */
    validateTaxonomy(family, genus, species) {
        const validation = { valid: true }

        if (!family) {
            if (genus || species) {
                validation.error = { rank: 'family', message: 'Family must be provided if genus or species is specified' }
                validation.valid = false
            }
            validation.family = Object.keys(this.taxonomy)
        } else if (!this.taxonomy[family]) {
            validation.error = { rank: 'family', message: 'Invalid family' }
            validation.valid = false
            validation.family = Object.keys(this.taxonomy)
        } else if (!genus) {
            if (species) {
                validation.error = { rank: 'genus', message: 'Genus must be provided if species is specified' }
                validation.valid = false
            }
            validation.genus = Object.keys(this.taxonomy[family])
        } else if (!this.taxonomy[family][genus]) {
            validation.error = { rank: 'genus', message: 'Invalid genus' }
            validation.valid = false
            validation.genus = Object.keys(this.taxonomy[family])
        } else if (!species) {
            validation.species = this.taxonomy[family][genus]
        } else if (!this.taxonomy[family][genus].includes(species)) {
            validation.error = { rank: 'species', message: 'Invalid species' }
            validation.valid = false
            validation.species = this.taxonomy[family][genus]
        }

        return validation
    }

    /*
     * validateSexCaste()
     * Checks that a given combination of sex and caste is valid
     * Returns an error, options for the other unspecified value, and a validity flag
     */
    validateSexCaste(sex, caste) {
        const validation = { valid: true }

        const casteSex = {}
        Object.entries(this.sexCaste).forEach(([sex, casteList]) => casteList.forEach((caste) => {
            if (!casteSex[caste]) casteSex[caste] = []
            casteSex[caste].push(sex)
        }))

        if (!sex && !caste) {
            validation.sex = Object.keys(this.sexCaste)
            validation.caste = Object.keys(casteSex)
        } else if (sex && !caste) {
            if (this.sexCaste[sex]) {
                validation.caste = this.sexCaste[sex]
            } else {
                validation.error = { field: 'sex', message: 'Invalid sex' }
                validation.valid = false
                validation.sex = Object.keys(this.sexCaste)
            }
        } else if (!sex && caste) {
            if (casteSex[caste]) {
                validation.sex = casteSex[caste]
            } else {
                validation.error = { field: 'caste', message: 'Invalid caste' }
                validation.valid = false
                validation.caste = Object.keys(casteSex)
            }
        } else if (!this.sexCaste[sex].includes(caste)) {
            validation.error = { field: 'caste', message: 'Invalid caste' }
            validation.valid = false
            validation.caste = this.sexCaste[sex]
        }

        return validation
    }
}

export default new TaxonomyService()