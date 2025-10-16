import Router from 'express'

import adminsRouter from './admins.js'
import archiveRouter from './archive.js'
import determinationsRouter from './determinations.js'
import tasksRouter from './tasks.js'
import usernamesRouter from './usernames.js'

const apiRouter = Router()

apiRouter.use('/admins', adminsRouter)
apiRouter.use('/archive', archiveRouter)
apiRouter.use('/determinations', determinationsRouter)
apiRouter.use('/tasks', tasksRouter)
apiRouter.use('/usernames', usernamesRouter)

export default apiRouter