import Router from 'express'

import adminsRouter from './admins.js'
import archiveRouter from './archive.js'
import tasksRouter from './tasks.js'
import usernamesRouter from './usernames.js'

const apiRouter = Router()

apiRouter.use('/admins', adminsRouter)
apiRouter.use('/archive', archiveRouter)
apiRouter.use('/tasks', tasksRouter)
apiRouter.use('/usernames', usernamesRouter)

export default apiRouter