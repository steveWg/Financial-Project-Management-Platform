import { Router } from 'express'
import multer from 'multer'
import {
  addDictionaryValue,
  getBootstrapData,
  removeDictionaryValue,
  saveProjectRecord,
  saveUserRecord,
  setUserStatus,
  updateWarningHandling
} from '../repositories/projectRepository.js'
import { applyProjectImport, buildProjectExportWorkbook, previewProjectImport } from '../services/excelProjects.js'

const upload = multer({ storage: multer.memoryStorage() })

export function createApiRouter(db) {
  const router = Router()

  router.get('/bootstrap', (req, res) => {
    res.json(getBootstrapData(db))
  })

  router.post('/users', (req, res) => {
    saveUserRecord(db, req.body)
    res.status(201).json(getBootstrapData(db))
  })

  router.put('/users/:id', (req, res) => {
    saveUserRecord(db, { ...req.body, id: req.params.id })
    res.json(getBootstrapData(db))
  })

  router.patch('/users/:id/status', (req, res) => {
    setUserStatus(db, req.params.id, req.body.status)
    res.json(getBootstrapData(db))
  })

  router.post('/dictionaries/:type', (req, res) => {
    addDictionaryValue(db, req.params.type, req.body.value)
    res.status(201).json(getBootstrapData(db))
  })

  router.delete('/dictionaries/:type/:value', (req, res) => {
    removeDictionaryValue(db, req.params.type, decodeURIComponent(req.params.value))
    res.json(getBootstrapData(db))
  })

  router.post('/projects', (req, res) => {
    const project = saveProjectRecord(db, { ...req.body, id: req.body.id || `p${Date.now()}` })
    res.status(201).json({ ...getBootstrapData(db), project })
  })

  router.put('/projects/:id', (req, res) => {
    const project = saveProjectRecord(db, { ...req.body, id: req.params.id })
    res.json({ ...getBootstrapData(db), project })
  })

  router.patch('/projects/:id/progress', (req, res) => {
    const current = getBootstrapData(db).projects.find((item) => item.id === req.params.id)
    if (!current) return res.status(404).json({ message: 'Project not found' })

    const project = saveProjectRecord(db, {
      ...current,
      ...req.body,
      logs: [
        {
          id: `l${Date.now()}`,
          date: new Date().toISOString().slice(0, 10),
          author: req.body.operator || '当前用户',
          content: `更新拨款进度至 ${(((req.body.paymentProgress ?? current.paymentProgress) || 0) * 100).toFixed(2)}%，项目进度为${req.body.projectProgress || current.projectProgress}。`
        },
        ...(current.logs || [])
      ]
    })
    res.json({ ...getBootstrapData(db), project })
  })

  router.post('/warnings/:id/handle', (req, res) => {
    updateWarningHandling(db, req.params.id, req.body)
    res.json(getBootstrapData(db))
  })

  router.get('/export/projects.xlsx', async (req, res, next) => {
    try {
      const workbook = await buildProjectExportWorkbook(db)
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      res.setHeader('Content-Disposition', 'attachment; filename="projects.xlsx"')
      await workbook.xlsx.write(res)
      res.end()
    } catch (error) {
      next(error)
    }
  })

  router.post('/import/projects.xlsx/preview', upload.single('file'), async (req, res, next) => {
    try {
      if (!req.file) return res.status(400).json({ message: 'Excel file is required' })
      res.json(await previewProjectImport(db, req.file.buffer))
    } catch (error) {
      next(error)
    }
  })

  router.post('/import/projects.xlsx/apply', upload.single('file'), async (req, res, next) => {
    try {
      if (!req.file) return res.status(400).json({ message: 'Excel file is required' })
      res.json(await applyProjectImport(db, req.file.buffer))
    } catch (error) {
      next(error)
    }
  })

  return router
}
