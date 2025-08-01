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
        if (!ObjectId.isValid(id)) return

        return await this.collection.findOne({ _id: new ObjectId(id) }, options)
    }

    async findOne(filter = {}, options = {}) {
        return await this.collection.findOne(filter, options)
    }

    async findMany(filter = {}, options = {}) {
        return await this.collection.find(filter, options).toArray()
    }

    async paginate(options = {}) {
        const {
            page = 1,
            pageSize = 1000,
            filter = {},
            sortConfig = [],
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
                                .sort(sortStage)
                                .skip(skip)
                                .limit(pageSize)
                                .toArray()

        // Get total count
        let total = 0
        if (includeTotal) {
            total = Object.keys(filter).length === 0
                        ? await this.collection.estimatedDocumentCount()
                        : await this.collection.countDocuments(filter)
        }

        return {
            data,
            pagination: {
                currentPage: page,
                pageSize,
                totalDocuments: total,
                totalPages: Math.ceil(total / pageSize),
                hasNextPage: page < Math.ceil(total / pageSize),
                hasPrevPage: page > 1
            }
        }
    }

    async count(filter) {
        return await this.collection.countDocuments(filter)
    }

    async distinct(field, query = {}) {
        return await this.collection.distinct(field, query)
    }

    // Update
    async updateById(id, update = {}) {
        const result = await this.collection.updateOne(
            { _id: id },
            update
        )

        return result.modifiedCount
    }

    async updateMany(filter = {}, update = {}) {
        const result = await this.collection.updateMany(filter, update)

        return result.modifiedCount
    }

    // Delete
    async deleteById(id) {
        if (!ObjectId.isValid(id)) return

        const result = await this.collection.deleteOne({ _id: new ObjectId(id) })

        return result.deletedCount
    }

    async deleteOne(filter = {}) {
        const result = await this.collection.deleteOne(filter)

        return result.deletedCount
    }

    async deleteMany(filter) {
        const result = await this.collection.deleteMany(filter)

        return result.deletedCount
    }

    /* General Operations */

    async aggregate(pipeline, options = {}) {
        return await this.collection.aggregate(pipeline, options).toArray()
    }
}