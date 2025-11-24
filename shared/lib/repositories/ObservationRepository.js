import { fieldNames } from '../utils/constants.js'
import BaseRepository from './BaseRepository.js'

export default class ObservationRepository extends BaseRepository {
    constructor() {
        super('observations')
    }

    /* CRUD Operations */

    // Read
    async distinctCoordinates() {
        const response = await this.aggregate([
            {
                $match: {
                    'geojson.coordinates': { $exists: true, $ne: null }
                }
            },
            {
                $group: {
                    _id: {
                        $concat: [
                            { $toString: { $round: [{ $arrayElemAt: [ '$geojson.coordinates', 1 ] }, 4] } },
                            ',',
                            { $toString: { $round: [{ $arrayElemAt: [ '$geojson.coordinates', 0 ] }, 4] } }
                        ]
                    }
                }
            }
        ])
        const coordinates = response?.map((doc) => doc._id) ?? []

        return coordinates
    }

    async findUnmatched() {
        return await this.findMany({ matched: false })
    }
}