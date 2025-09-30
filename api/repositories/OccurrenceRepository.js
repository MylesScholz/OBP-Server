import { fieldNames, occurrences } from '../utils/constants.js'
import BaseRepository from './BaseRepository.js'

export default class OccurrenceRepository extends BaseRepository {
    constructor() {
        super('occurrences')
        this.sortConfig = occurrences.sortConfig
    }

    /* Helper Methods */

    numberToSortableString(number, maxDigits = 16) {
        if (number === null || number === undefined || number === '') {
            return 'z'.repeat(maxDigits)    // Blanks sorted last
        }

        const value = parseFloat(number)
        if (isNaN(value)) {
            return 'z'.repeat(maxDigits)    // Invalid numbers sorted last
        }

        return value.toString().padStart(maxDigits, '0')
    }

    setSortField(document, sortConfig) {
        const processedDocument = { ...document }

        // Assemble a single composite sort string
        const compositeParts = []
        sortConfig.forEach((config) => {
            const { field, type = 'string' } = config
            const value = document[field]

            if (type === 'number') {
                compositeParts.push(this.numberToSortableString(value, 16))
            } else {
                const sortValue = value || 'z'.repeat(16)   // Blanks sorted last
                compositeParts.push(sortValue)
            }
        })

        processedDocument.composite_sort = compositeParts.join('|')
        return processedDocument
    }

    /* CRUD Operations */

    // Create
    async create(document) {
        const processedDocument = this.setSortField(document, this.sortConfig)

        return await super.create(processedDocument)
    }

    async createMany(documents) {
        const processedDocuments = documents.map((doc) => this.setSortField(doc, this.sortConfig))

        return await super.createMany(processedDocuments)
    }

    // Read
    async distinctCoordinates(filter = {}) {
        // Group by unique latitude-longitude combinations and convert to floats
        const response = await this.aggregate([
            {
                $match: {
                    ...filter,
                    $and: [
                        { [fieldNames.latitude]: { $exists: true, $nin: [ null, '' ] } },
                        { [fieldNames.longitude]: { $exists: true, $nin: [ null, '' ] } }
                    ]
                }
            },
            {
                $group: {
                    _id: {
                        latitude: `$${fieldNames.latitude}`,
                        longitude: `$${fieldNames.longitude}`
                    }
                }
            },
            {
                $project: {
                    _id: 0,
                    latitude: {
                        $convert: {
                            input: '$_id.latitude',
                            to: 'double',
                            onError: null,
                            onNull: null
                        }
                    },
                    longitude: {
                        $convert: {
                            input: '$_id.longitude',
                            to: 'double',
                            onError: null,
                            onNull: null
                        }
                    }
                }
            }
        ])

        // Round the latitudes and longitudes to 4 decimal places and join them with a comma
        const formattedCoordinates = response.filter((doc) => doc.latitude && doc.longitude)
                                             .map((doc) => `${doc.latitude.toFixed(4)},${doc.longitude.toFixed(4)}`)

        return formattedCoordinates
    }

    async maxFieldNumber() {
        const response = await this.aggregate([
            {
                $match: {
                    [fieldNames.fieldNumber]: { $exists: true, $nin: [ null, '' ] }
                }
            },
            {
                $addFields: {
                    fieldNumberInt: {
                        $convert: {
                            input: `$${fieldNames.fieldNumber}`,
                            to: 'int',
                            onError: null,
                            onNull: null
                        }
                    }
                }
            },
            {
                $match: {
                    fieldNumberInt: { $ne: null }
                }
            },
            {
                $group: {
                    _id: null,
                    maxFieldNumber: { $max: "$fieldNumberInt" }
                }
            }
        ])

        const maxFieldNumber = response[0]?.maxFieldNumber

        return maxFieldNumber
    }

    // Update
    async updateById(id, updateDocument = {}) {
        // Require that the update document has all of the sort fields
        const keys = Object.keys(updateDocument)
        if (!this.sortConfig.every(({ field }) => keys.includes(field))) return 0

        const processedDocument = this.setSortField(updateDocument, this.sortConfig)
        return await super.updateById(id, { $set: processedDocument })
    }

    async updateMany(filter = {}, updateDocument = {}) {
        // Require that the update document has all of the sort fields
        const keys = Object.keys(updateDocument)
        if (!this.sortConfig.every(({ field }) => keys.includes(field))) return 0

        const processedDocument = this.setSortField(updateDocument, this.sortConfig)
        return await super.updateMany(filter, { $set: processedDocument })
    }
}