import Router from 'express'

import adminsRouter from './admins.js'
import archiveRouter from './archive.js'
import determinationsRouter from './determinations.js'
import occurrencesRouter from './occurrences.js'
import plantListRouter from './plantList.js'
import tasksRouter from './tasks.js'
import taxonomyRouter from './taxonomy.js'
import usernamesRouter from './usernames.js'

const apiRouter = Router()

apiRouter.use('/admins', adminsRouter)
apiRouter.use('/archive', archiveRouter)
apiRouter.use('/determinations', determinationsRouter)
apiRouter.use('/occurrences', occurrencesRouter)
apiRouter.use('/plantList', plantListRouter)
apiRouter.use('/tasks', tasksRouter)
apiRouter.use('/taxonomy', taxonomyRouter)
apiRouter.use('/usernames', usernamesRouter)

export default apiRouter