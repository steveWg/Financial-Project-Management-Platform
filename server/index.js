import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import express from 'express'
import { createApp } from './app.js'
import { openDatabase } from './db/connection.js'
import { seedDatabase } from './db/seed.js'

const port = Number(process.env.PORT || 3001)
const dbPath = resolve(process.env.SQLITE_PATH || 'server/data/project-management.db')
const db = openDatabase(dbPath)
seedDatabase(db)

const app = createApp({ db })
const distPath = resolve('dist')
if (existsSync(distPath)) {
  app.use(express.static(distPath))
  app.get('*', (req, res) => res.sendFile(join(distPath, 'index.html')))
}

app.listen(port, () => {
  console.log(`Project management backend listening on http://localhost:${port}`)
})
