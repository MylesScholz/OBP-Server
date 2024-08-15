import vhost from 'vhost'
import express from 'express'
import morgan from 'morgan'

import observationsRouter from './api/observations.js'
import labelsRouter from './api/labels.js'

const port = process.env.PORT || '8080'
const app = express()
const apiRouter = express.Router()

app.use(morgan('dev'))
app.use(express.json())
app.use(express.static('public'))
app.use(express.static('dist'))

// API routes
apiRouter.use('/observations', observationsRouter)
apiRouter.use('/labels', labelsRouter)
app.use(vhost('api.*', apiRouter))

// TODO: error handling

app.listen(port, () => {
    console.log('Listening on port ' + port + '...')
})