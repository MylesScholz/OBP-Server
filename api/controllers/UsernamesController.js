import path from 'path'

export default class UsernamesController {
    static async getUsernamesFile(req, res, next) {
        // Send usernames.csv
        res.status(200).sendFile(path.resolve('./api/data/usernames.csv'))
    }

    static async uploadUsernamesFile(req, res, next) {
        // Check that required field exists
        if (!req.file) {
            res.status(400).send({
                error: 'Missing required request field'
            })
            return
        }

        res.status(200).send()
    }
}