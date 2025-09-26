import Router from 'express'

import adminsRouter from './admins.js'
import archiveRouter from './archive.js'
import tasksRouter from './tasks.js'
import usernamesRouter from './usernames.js'
import determinationsRouter from './determinations.js'

const apiRouter = Router()

apiRouter.use('/admins', adminsRouter)
apiRouter.use('/archive', archiveRouter)
apiRouter.use('/tasks', tasksRouter)
apiRouter.use('/usernames', usernamesRouter)
apiRouter.use('/determinations', determinationsRouter)

export default apiRouter