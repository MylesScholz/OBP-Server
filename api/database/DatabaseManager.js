import mongoConnection from './mongoConnection.js'
import config from '../config/environment.js'
import { fieldNames, sortConfig } from '../utils/constants.js'

class DatabaseManager {
    constructor() {
        this.db = null
        this.isConnected = false
        this.indexes = new Map()
    }

    /*
     * initialize()
     * Initializes database connection and setup
     */
    async initialize(options = {}) {
        try {
            this.db = await mongoConnection.connect()
            this.isConnected = true

            console.log(`Connected to MongoDB: ${config.database.name}`)

            if (!options.skipIndexes) {
                await this.createIndexes()
            }

            if (!options.skipViews) {
                await this.createViews()
            }

            return this.db
        } catch (error) {
            console.error('Database initialization failed:', error)
            throw error
        }
    }

    /*
     * getDatabase()
     * Returns the database instance
     */
    getDatabase() {
        if (!this.db) {
            throw new Error('Database not initialized. Call initialize() first.')
        }
        return this.db
    }

    /*
     * getCollection()
     * Returns a specific collection by name
     */
    getCollection(name) {
        const db = this.getDatabase()
        return db.collection(name)
    }

    /*
     * collectionExists()
     * Returns whether a collection exists by name
     */
    async collectionExists(name) {
        const db = this.getDatabase()
        const collections = await db.listCollections({ name: name }).toArray()
        return collections.length > 0
    }

    /*
     * getIndexDefinitions()
     * Returns the index definitions for all collections
     */
    getIndexDefinitions() {
        return {
            'occurrences': [
                { 'composite_sort': 1 },
                { [fieldNames.iNaturalistUrl]: 1 },
                {
                    [fieldNames.errorFlags]: 1,
                    [fieldNames.dateLabelPrint]: 1
                },
                {
                    [fieldNames.errorFlags]: 1,
                    'new': 1
                },
                {
                    [fieldNames.recordedBy]: 1,
                    [fieldNames.fieldNumber]: 1
                }
            ],
            'observations': [
                { 'uri': 1, 'matched': 1 }
            ],
            'determinations': [
                {
                    [fieldNames.fieldNumber]: 1
                }
            ]
        }
    }

    /*
     * generateIndexName()
     * Generates a consistent name for an index based on its spec
     */
    generateIndexName(indexSpec) {
        return Object.entries(indexSpec)
                     .map(([field, direction]) => `${field}_${direction}`)
                     .join('_')
    }

    /*
     * createCollectionIndexes()
     * Creates indexes for a specific collection by name
     */
    async createCollectionIndexes(collectionName, indexes) {
        try {
            const collection = this.getCollection(collectionName)

            for (const indexSpec of indexes) {
                const indexName = this.generateIndexName(indexSpec)

                // Skip this index if it already exists
                if (this.indexes.has(`${collectionName}.${indexName}`)) continue

                const options = {
                    background: true,   // Non-blocking
                    name: indexName
                }

                // Insert TTL handling here

                await collection.createIndex(indexSpec, options)
                this.indexes.set(`${collectionName}.${indexName}`, {
                    collection: collectionName,
                    spec: indexSpec
                })

                console.log(`Created index ${indexName} on ${collectionName}`)
            }
        } catch (error) {
            console.error(`Failed to create indexes for '${collectionName}':`, error)
        }
    }

    /*
     * createIndexes()
     * Creates all predefined indexes
     */
    async createIndexes() {
        const indexDefinitions = this.getIndexDefinitions()

        for (const [collectionName, indexes] of Object.entries(indexDefinitions)) {
            // Reset indexes first to ensure only predefined indexes are set
            await this.dropCollectionIndexes(collectionName)
            await this.createCollectionIndexes(collectionName, indexes)
        }
    }

    /*
     * dropCollectionIndexes()
     * Drops indexes for a specific collection
     */
    async dropCollectionIndexes(collectionName) {
        try {
            const collection = this.getCollection(collectionName)

            const indexes = await collection.indexes()

            for (const index of indexes) {
                // Don't drop the _id index
                if (index.name != '_id_') {
                    await collection.dropIndex(index.name)
                    this.indexes.delete(`${collectionName}.${index.name}`)
                }
            }

            console.log(`Dropped indexes for ${collectionName}`)
        } catch (error) {
            console.error(`Failed to drop indexes for '${collectionName}':`, error)
        }
    }

    /*
     * createViews()
     * Creates preset views between occurrences and observations; drops pre-existing views
     */
    async createViews() {
        await this.db.collection('occurrencesIJoinObservations').drop()
        await this.db.collection('observationsIJoinOccurrences').drop()

        await this.db.createCollection('occurrencesIJoinObservations', {
            viewOn: 'occurrences',
            pipeline: [
                {
                    $lookup: {
                        from: 'observations',
                        let: { occurrenceUrl: `$${fieldNames.iNaturalistUrl}` },
                        pipeline: [
                            {
                                $match: {
                                    $expr: { $eq: [ '$uri', '$$occurrenceUrl' ] },
                                    matched: true
                                }
                            }
                        ],
                        as: 'observation'
                    }
                },
                {
                    $unwind: '$observation'
                }
            ]
        })

        const sortOrder = {}
        for (const config of sortConfig) {
            sortOrder[config.field] = config.direction
        }
        await this.db.createCollection('observationsIJoinOccurrences', {
            viewOn: 'observations',
            pipeline: [
                {
                    $lookup: {
                        from: 'occurrences',
                        localField: 'uri',
                        foreignField: fieldNames.iNaturalistUrl,
                        as: 'occurrences'
                    }
                },
                {
                    $project: {
                        firstOccurrence: {
                            $first: {
                                $sortArray: {
                                    input: '$occurrences',
                                    sortBy: sortOrder
                                }
                            }
                        },
                        occurrenceCount: { $size: '$occurrences' }
                    }
                },
                {
                    $project: {
                        occurrences: 0
                    }
                },
                {
                    $match: {
                        occurrencesCount: { $gt: 0 }
                    }
                }
            ]
        })

        console.log('Views created successfully')
    }

    /*
     * disconnect()
     * Closes the Mongo Server connection gracefully
     */
    async disconnect() {
        try {
            if (mongoConnection.client) {
                await mongoConnection.client.close()
                this.isConnected = false
                this.db = null
                console.log('MongoDB connection closed')
            }
        } catch (error) {
            console.error('Error during database disconnect:', error)
        }
    }
}

export default new DatabaseManager()