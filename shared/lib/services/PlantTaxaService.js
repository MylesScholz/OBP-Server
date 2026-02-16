import ApiService from './ApiService.js'
import FileManager from '../utils/FileManager.js'

class PlantTaxaService {
    constructor() {
        this.filePath = './shared/data/taxa.json'
        this.taxa = {}

        this.readTaxa()
    }

    /*
     * writeTaxa()
     * Writes given taxa data to taxa.json; if no data provided, writes this.taxa
     */
    writeTaxa(taxa) {
        const data = taxa || this.taxa
        const success = FileManager.writeJSON(this.filePath, data)

        // If wrote successfully, update this.taxa
        if (success) this.taxa = data

        return success
    }

    /*
     * readTaxa()
     * Reads and parses taxa.json; updates this.taxa
     */
    readTaxa() {
        const data = FileManager.readJSON(this.filePath, this.taxa)
        if (data) {
            this.taxa = data
            return data
        }
    }

    /*
     * getPlantAncestry()
     * Searches in the taxonomy (this.taxa) for the plant ancestry of the given taxon; reads taxa.json if absent
     */
    getPlantAncestry(taxon) {
        // Read taxa data if not defined
        if (!Object.keys(this.taxa).length === 0) {
            this.readTaxa()
        }

        const plantAncestry = {
            phylum: '',
            order: '',
            family: '',
            genus: '',
            species: ''
        }

        // Check the taxon exists
        if (!taxon) {
            return plantAncestry
        }

        // Look up each ancestor in the local taxonomy dataset
        const ancestorIds = taxon.min_species_ancestry?.split(',') ?? []
        for (const ancestorId of ancestorIds) {
            const ancestorTaxon = this.taxa[ancestorId]
            if (ancestorTaxon) {
                plantAncestry[ancestorTaxon.rank] = ancestorTaxon.name
            }
        }

        // If the given taxon is at least species level, use its name instead of the result of the local data
        const minSpeciesTaxonRanks = ['species', 'hybrid', 'subspecies', 'variety', 'form']
        if (minSpeciesTaxonRanks.includes(taxon.rank)) {
            plantAncestry.species = taxon.name || plantAncestry.species
        }

        // Use the given taxon as a minimum (unless it is empty)
        plantAncestry[taxon.rank] = taxon.name || plantAncestry[taxon.rank]

        return plantAncestry
    }

    getTaxonNamesByIds(taxonIds) {
        // Read taxa data if not defined
        if (!Object.keys(this.taxa).length === 0) {
            this.readTaxa()
        }

        const taxonNames = []

        for (const id of taxonIds) {
            if (this.taxa[id] && this.taxa[id].name) {
                taxonNames.push(this.taxa[id].name)
            }
        }

        return taxonNames
    }

    /*
     * updateTaxaFromObservations()
     * Updates local taxonomy data from the given observations
     */
    async updateTaxaFromObservations(observations, updateProgress) {
        // Read taxa data
        this.readTaxa()
    
        // Compile a list of unknown taxa from the given observations
        const unknownTaxa = []
        for (const observation of observations) {
            const ancestors = observation.taxon?.min_species_ancestry?.split(',') ?? []
            const synonyms = observation.taxon?.current_synonymous_taxon_ids?.map((id) => id.toString()) ?? []
    
            for (const id of ancestors) {
                if (!(id in this.taxa) && !unknownTaxa.includes(id)) {
                    unknownTaxa.push(id)
                }
            }
            for (const id of synonyms) {
                if (!(id in this.taxa) && !unknownTaxa.includes(id)) {
                    unknownTaxa.push(id)
                }
            }
        }
    
        // Fetch data for each unknown taxon from iNaturalist.org and combine it with the existing data
        if (unknownTaxa.length > 0) {
            const newTaxa = await ApiService.fetchTaxaByIds(unknownTaxa, updateProgress)
    
            const savedRanks = ['phylum', 'order', 'family', 'genus', 'species']
            for (const newTaxon of newTaxa) {
                if (savedRanks.includes(newTaxon.rank)) {
                    this.taxa[newTaxon.id] = {
                        rank: newTaxon.rank,
                        name: newTaxon.name
                    }
                }
            }
        }
    
        // Store the updated taxonomy data
        this.writeTaxa()
    }
}

export default new PlantTaxaService()