import { MongoClient } from 'mongodb'
import { database } from '../config/environment.js'

class Connection {
    constructor() {
        this.client = null
        this.db = null
    }

    async connect() {
        if (!this.client) {
            this.client = new MongoClient(database.uri)
            await this.client.connect()
            this.db = this.client.db()
        }
        return this.db
    }
}

export default new Connection()