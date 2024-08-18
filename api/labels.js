import Router from 'express'

const labelsRouter = Router()

labelsRouter.get('/', (req, res, next) => {
    res.status(200).send({
        status: "OK"
    })
})

export default labelsRouter