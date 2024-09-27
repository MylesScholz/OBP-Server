import { MongoClient } from 'mongodb'
import 'dotenv/config'

// Mongo server network address
const mongoHost = process.env.MONGO_HOST || 'localhost'
const mongoPort = process.env.MONGO_PORT || 27017
// Mongo username of the server
const mongoUser = process.env.MONGO_USER
// Mongo password for the server
const mongoPassword = process.env.MONGO_PASSWORD
// Mongo database where the server operates
const mongoDbName = process.env.MONGO_DB
// Authentication database for the server (if different from MONGO_DB)
const mongoAuthDbName = process.env.MONGO_AUTH_DB || mongoDbName

const mongoURL = `mongodb://${mongoUser}:${mongoPassword}@${mongoHost}:${mongoPort}/${mongoAuthDbName}`

let _db = null
let _closeDbConnection = null

async function connectToDb() {
    console.log(`Connecting to ${mongoURL}...`)

    const client = await MongoClient.connect(mongoURL)

    _db = client.db(mongoDbName)
    _closeDbConnection = function () {
        client.close()
    }
}

function getDb() {
    return _db
}

function closeDbConnection() {
    _closeDbConnection()
}

export { connectToDb, getDb, closeDbConnection }