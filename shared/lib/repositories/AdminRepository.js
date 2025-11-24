import BaseRepository from './BaseRepository.js'

export default class AdminRepository extends BaseRepository {
    constructor() {
        super('admins')
    }
}