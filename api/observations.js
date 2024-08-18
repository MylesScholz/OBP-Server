import Router from 'express'

const observationsRouter = Router()

observationsRouter.get('/', (req, res, next) => {
    res.status(200).send({
        status: "OK"
    })
})

export default observationsRouter