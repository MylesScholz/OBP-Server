import { MongoClient } from 'mongodb'
import 'dotenv/config'

const mongoHost = process.env.MONGO_HOST || 'localhost'
const mongoPort = process.env.MONGO_PORT || 27017
const mongoUser = process.env.MONGO_USER
const mongoPassword = process.env.MONGO_PASSWORD
const mongoDbName = process.env.MONGO_DB
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