import express from 'express'
import morgan from 'morgan'

const app = express()
const port = process.env.PORT || '8080'

app.use(morgan('dev'))
app.use(express.json())
app.use(express.static('public'))
app.use(express.static('dist'))

app.use('*', (req, res, next) => {
    res.redirect('/')
})

app.listen(port, () => {
    console.log('Listening on port ' + port + '...')
})