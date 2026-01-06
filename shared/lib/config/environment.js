import 'dotenv/config'

/* Helper Functions */

function required(name) {
    const value = process.env[name]
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`)
    }
    return value
}

function parseNumber(value, defaultValue) {
  const parsed = parseInt(value, 10)
  return isNaN(parsed) ? defaultValue : parsed
}

/* MongoDB Config */

// Mongo server network address
const mongoHost = process.env.MONGO_HOST || 'localhost'
const mongoPort = process.env.MONGO_PORT || 27017
// Mongo username of the server
const mongoUser = required('MONGO_USER')
// Mongo password for the server
const mongoPassword = required('MONGO_PASSWORD')
// Mongo database where the server operates
const mongoDbName = process.env.MONGO_DB || 'api-backend'
// Authentication database for the server (if different from MONGO_DB)
const mongoAuthDbName = process.env.MONGO_AUTH_DB || mongoDbName
// Mongo connection URI
const mongoUri = `mongodb://${mongoUser}:${mongoPassword}@${mongoHost}:${mongoPort}/${mongoAuthDbName}`

/* RabbitMQ Config */

// RabbitMQ server network address
const rabbitmqHost = process.env.RABBITMQ_HOST || 'localhost'
// RabbitMQ connection URI
const rabbitmqUri = `amqp://${rabbitmqHost}`

/* Full Config */

const config = {
    port: parseNumber(process.env.PORT, 3000),
    database: {
        host: mongoHost,
        port: process.env.MONGO_PORT || 27017,
        name: mongoDbName,
        uri: mongoUri,
        adminUsername: required('ADMIN_USERNAME'),
        adminPassword: required('ADMIN_PASSWORD')
    },
    messageBroker: {
        host: rabbitmqHost,
        uri: rabbitmqUri,
        queueName: 'tasks'
    },
    auth: {
        jwtSecret: required('JWT_SECRET')
    }
}

export const { port } = config
export const { database } = config
export const { messageBroker } = config
export const { auth } = config

export default config