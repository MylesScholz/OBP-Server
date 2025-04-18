import { ObjectId } from 'mongodb'
import bcryptjs from 'bcryptjs'

import { getDb } from '../lib/mongo.js'

/*
 * createAdmin()
 * Inserts a new admin with the given username (if unique) and password (hashed)
 */
async function createAdmin(username, password) {
    if (!username || !password) {
        throw new Error('Missing required value')
    }
    if (await getAdminByUsername(username)) {
        throw new Error('Username must be unique')
    }

    const admin = {
        username,
        password: bcryptjs.hashSync(password, 10)
    }

    const db = getDb()
    const collection = db.collection('admins')
    const result = await collection.insertOne(admin)

    return {
        id: result.insertedId
    }
}

async function deleteAdminById(id) {
    if (!ObjectId.isValid(id)) {
        return false
    }
    const db = getDb()
    const collection = db.collection('admins')

    const { deletedCount } = await collection.deleteOne({ _id: new ObjectId(id) })
    return deletedCount === 1
}

/*
 * getAdmins()
 * Returns all admins, passwords excluded
 */
async function getAdmins() {
    const db = getDb()
    const collection = db.collection('admins')

    const result = await collection.find({}).project({ password: false }).toArray()
    return result
}

/*
 * getAdminById()
 * Finds a specific admin by Mongo ID
 */
async function getAdminById(id) {
    const db = getDb()
    const collection = db.collection('admins')

    // Check ID argument before attempting query
    if (!ObjectId.isValid(id)) {
        return
    } else {
        const result = await collection.findOne({ _id: new ObjectId(id) })
        return result
    }
}

/*
 * getAdminByUsername()
 * Finds a specific admin by its username property
 */
async function getAdminByUsername(username) {
    const db = getDb()
    const collection = db.collection('admins')
    
    const result = await collection.findOne({ username: username })
    return result
}

export { createAdmin, deleteAdminById, getAdmins, getAdminById, getAdminByUsername }