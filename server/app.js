import cors from 'cors'
import express from 'express'
import { createApiRouter } from './routes/api.js'

export function createApp({ db }) {
  const app = express()
  app.use(cors())
  app.use(express.json({ limit: '10mb' }))
  app.use('/api', createApiRouter(db))
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error)
    res.status(500).json({ message: error.message || 'Server error' })
  })
  return app
}
