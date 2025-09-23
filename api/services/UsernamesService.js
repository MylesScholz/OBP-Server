import { usernames } from '../utils/constants.js'
import FileManager from '../utils/FileManager.js'

class UsernamesService {
    constructor() {
        this.filePath = './api/data/usernames.csv'
        this.header = Object.values(usernames.fieldNames)
        this.usernames = []

        this.readUsernames()
    }

    /*
     * readUsernames()
     * Reads and parses usernames.csv; updates this.usernames
     */
    readUsernames() {
        const data = FileManager.readCSV(this.filePath, [], this.header)
        if (data) {
            this.usernames = data
            return data
        }
    }

    /*
     * getUserName()
     * Searches for a first name, initial, and last name by user login in the usernames data
     */
    getUserName(userLogin) {
        // Read usernames data if not defined
        if (this.usernames.length === 0) {
            this.readUsernames()
        }

        const user = this.usernames.find((u) => u.userLogin === userLogin)

        const firstName = user?.firstName ?? ''
        const firstNameInitial = user?.firstNameInitial ?? ''
        const lastName = user?.lastName ?? ''

        return { firstName, firstNameInitial, lastName }
    }

    /*
     * getUserNameByFullName
     * Searches for a first name, initial, and last name by full name in the usernames data
     */
    getUserNameByFullName(fullName) {
        // Read usernames data if not defined
        if (this.usernames.length === 0) {
            this.readUsernames()
        }

        const user = this.usernames.find((u) => u.fullName === fullName)

        const firstName = user?.firstName ?? ''
        const firstNameInitial = user?.firstNameInitial ?? ''
        const lastName = user?.lastName ?? ''

        return { firstName, firstNameInitial, lastName }
    }
}

export default new UsernamesService()