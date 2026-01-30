import { ObjectId } from 'mongodb'

import DatabaseManager from '../database/DatabaseManager.js'

export default class BaseRepository {
    constructor(collectionName) {
        this.databaseManager = DatabaseManager
        this.collectionName = collectionName
    }

    get collection() {
        return this.databaseManager.getCollection(this.collectionName)
    }

    /* CRUD Operations */

    // Create
    async create(document) {
        const result = await this.collection.insertOne(document)

        return result.insertedId
    }

    async createMany(documents, ordered = false) {
        const result = await this.collection.insertMany(documents, { ordered })

        return result.insertedIds
    }

    // Read
    async findById(id, options = {}) {
        const queryId = ObjectId.isValid(id) ? new ObjectId(id) : id

        return await this.collection.findOne({ _id: queryId }, options)
    }

    async findOne(filter = {}, options = {}) {
        return await this.collection.findOne(filter, options)
    }

    async findMany(filter = {}, options = {}, sort = {}) {
        return await this.collection.find(filter, options).sort(sort).toArray()
    }

    async paginate(options = { page: 1, pageSize: 1000, filter: {}, sortConfig: [], projection: {}, includeTotal: true }) {
        const page = Math.max(1, options.page ?? 1)
        const pageSize = Math.max(1, options.pageSize ?? 1000)
        const {
            filter = {},
            sortConfig = [],
            projection = {},
            includeTotal = true
        } = options

        const skip = (page - 1) * pageSize

        const sortStage = {}
        sortConfig.forEach((config) => {
            const { field, direction = 1 } = config
            sortStage[field] = direction
        })
        // Always add _id as final sort for consistency
        sortStage._id = 1
        
        // Query data
        const data = await this.collection
                                .find(filter)
                                .project(projection)
                                .sort(sortStage)
                                .skip(skip)
                                .limit(pageSize)
                                .toArray()

        // Get total count
        let totalDocuments = 0
        if (includeTotal) {
            totalDocuments = Object.keys(filter).length === 0
                        ? await this.collection.estimatedDocumentCount()
                        : await this.collection.countDocuments(filter)
        }

        const totalPages = Math.ceil(totalDocuments / pageSize)
        return {
            data,
            pagination: {
                currentPage: page,
                pageSize,
                totalDocuments: totalDocuments,
                totalPages: totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1
            }
        }
    }

    async count(filter) {
        return await this.collection.countDocuments(filter)
    }

    async distinct(field, filter = {}) {
        return await this.collection.distinct(field, filter)
    }

    // Update
    async updateById(id, update = {}, options = {}) {
        const queryId = ObjectId.isValid(id) ? new ObjectId(id) : id

        const result = await this.collection.updateOne(
            { _id: queryId },
            update,
            options
        )

        return result
    }

    async updateMany(filter = {}, update = {}, options = {}) {
        const result = await this.collection.updateMany(filter, update, options)

        return result.modifiedCount
    }

    async replaceById(id, replacement = {}, options = {}) {
        const queryId = ObjectId.isValid(id) ? new ObjectId(id) : id

        const result = await this.collection.replaceOne(
            { _id: queryId },
            replacement,
            options
        )

        return result
    }

    // Delete
    async deleteById(id) {
        const queryId = ObjectId.isValid(id) ? new ObjectId(id) : id

        const result = await this.collection.deleteOne({ _id: queryId })

        return result.deletedCount
    }

    async deleteOne(filter = {}) {
        const result = await this.collection.deleteOne(filter)

        return result.deletedCount
    }

    async deleteMany(filter = {}) {
        const result = await this.collection.deleteMany(filter)

        return result.deletedCount
    }

    /* General Operations */

    async aggregate(pipeline, options = {}) {
        return await this.collection.aggregate(pipeline, options).toArray()
    }
}