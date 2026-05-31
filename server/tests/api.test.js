import request from 'supertest'
import { describe, expect, test } from 'vitest'
import { createApp } from '../app.js'
import { openDatabase } from '../db/connection.js'
import { seedDatabase } from '../db/seed.js'

function app() {
  const db = openDatabase(':memory:')
  seedDatabase(db)
  return createApp({ db })
}

describe('api', () => {
  test('GET /api/bootstrap returns frontend data', async () => {
    const response = await request(app()).get('/api/bootstrap').expect(200)

    expect(response.body.users.length).toBeGreaterThan(0)
    expect(response.body.projects.length).toBeGreaterThan(0)
  })

  test('POST /api/projects creates a normalized project', async () => {
    const response = await request(app())
      .post('/api/projects')
      .send({ subProjectName: '接口项目', finalAccountAmount: 100, payments: [{ amount: 20 }] })
      .expect(201)

    expect(response.body.project.subProjectName).toBe('接口项目')
    expect(response.body.project.accumulatedPaymentAmount).toBe(20)
  })

  test('POST /api/warnings/:id/handle stores handled warning', async () => {
    const response = await request(app())
      .post('/api/warnings/w1/handle')
      .send({ handler: '管理员', note: '确认' })
      .expect(200)

    expect(response.body.handledWarnings.w1.status).toBe('已处理')
  })
})
