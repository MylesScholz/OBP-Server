import Router from 'express'

const labelsRouter = Router()

labelsRouter.get('/', (req, res, next) => {
    res.status(200).send("OK")
})

export default labelsRouter