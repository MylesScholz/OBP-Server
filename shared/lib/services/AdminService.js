import { AdminRepository } from '../repositories/index.js'
import { InvalidArgumentError, ValidationError } from '../utils/errors.js'
import { comparePasswordToHash, generateAuthToken, hashPassword, verifyJWT } from '../utils/auth.js'

class AdminService {
    constructor() {
        this.repository = new AdminRepository()
    }

    /*
     * getAdmins()
     * Returns a list of all current admins
     */
    async getAdmins() {
        // Exclude the password from the output
        const admins = await this.repository.findMany({}, {
            projection: {
                password: 0
            }
        })

        return admins
    }

    /*
     * createAdmin()
     * Creates a new admin with a given username and password
     */
    async createAdmin(username, password) {
        if (!username) { throw new InvalidArgumentError('Username is required') }
        if (!password) { throw new InvalidArgumentError('Password is required') }

        const existing = await this.repository.findOne({ username })
        if (existing) { throw new ValidationError('Username must be unique') }

        // Create the admin document
        const document = {
            username,
            password: hashPassword(password)
        }
        const id = await this.repository.create(document)

        // Return the newly created admin
        return await this.repository.findById(id)
    }

    /*
     * deleteAdminById()
     * Deletes a specific admin by ID, provided it is not the currently logged-in admin; returns the username of the deleted admin
     */
    async deleteAdminById(id) {
        const username = await this.repository.findById(id)
        const deletedCount = await this.repository.deleteById(id)

        if (deletedCount > 0) {
            return {
                deleted: true,
                deletedUsername: username
            }
        } else {
            return { deleted: false }
        }
    }

    /*
     * deleteAdminByUsername()
     * Deletes a specific admin by username, provided it is not the currently logged-in admin
     */
    async deleteAdminByUsername(username) {
        if (!username) return 0

        return await this.repository.deleteOne({ username })
    }

    /*
     * validateCredentials()
     * Checks a given username and password are a valid combination to login
     */
    async validateCredentials(username, password) {
        if (!username) { throw new InvalidArgumentError('Username is required') }
        if (!password) { throw new InvalidArgumentError('Password is required') }

        const admin = await this.repository.findOne({ username })
        if (!admin) { throw new ValidationError('Admin does not exist') }

        // Compare the given plaintext password against the hashed admin password
        if (comparePasswordToHash(password, admin.password)) {
            return {
                valid: true,
                token: generateAuthToken(admin._id)
            }
        } else {
            return { valid: false }
        }
    }

    /*
     * verifyLogin()
     * Checks that a given token is a valid JWT corresponding to a real admin
     */
    async verifyLogin(token) {
        if (!token) { throw new InvalidArgumentError('Token is required') }

        const payload = verifyJWT(token)
        const admin = await this.repository.findById(payload?.sub)

        if (admin) {
            return {
                loggedIn: true,
                username: admin.username,
                id: admin._id
            }
        } else {
            return { loggedIn: false }
        }
    }
}

export default new AdminService()