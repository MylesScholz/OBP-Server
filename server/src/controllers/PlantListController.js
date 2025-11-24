import path from 'path'

export default class PlantListController {
    static async getPlantList(req, res, next) {
        // Send plantList.csv
        res.status(200).sendFile(path.resolve('./shared/data/plantList.csv'))
    }

    static async uploadPlantList(req, res, next) {
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