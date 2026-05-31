import { describe, expect, test } from 'vitest'
import { openDatabase } from '../db/connection.js'
import { seedDatabase } from '../db/seed.js'
import { getBootstrapData, saveProjectRecord, updateWarningHandling } from '../repositories/projectRepository.js'

function testDb() {
  return openDatabase(':memory:')
}

describe('database schema', () => {
  test('creates the required tables', () => {
    const db = testDb()
    const tables = db.prepare("select name from sqlite_master where type = 'table' order by name").all().map((row) => row.name)

    expect(tables).toEqual(expect.arrayContaining(['users', 'dictionaries', 'projects', 'project_payments', 'project_logs', 'warning_handlings']))
  })

  test('seeds users, dictionaries, projects, payments, and logs once', () => {
    const db = testDb()
    seedDatabase(db)
    seedDatabase(db)

    expect(db.prepare('select count(*) as count from users').get().count).toBeGreaterThan(0)
    expect(db.prepare('select count(*) as count from dictionaries').get().count).toBeGreaterThan(0)
    expect(db.prepare('select count(*) as count from projects').get().count).toBeGreaterThan(0)
    expect(db.prepare('select count(*) as count from project_payments').get().count).toBeGreaterThan(0)
  })
})

describe('project repository', () => {
  test('returns bootstrap data in frontend store shape', () => {
    const db = testDb()
    seedDatabase(db)

    const data = getBootstrapData(db)

    expect(data.users.length).toBeGreaterThan(0)
    expect(Object.keys(data.dictionaries).length).toBeGreaterThan(0)
    expect(data.projects.length).toBeGreaterThan(0)
    expect(data.projects[0].payments).toHaveLength(6)
    expect(data.handledWarnings).toEqual({})
  })

  test('upserts a project with payments', () => {
    const db = testDb()
    const saved = saveProjectRecord(db, {
      id: 'p-test',
      serialNo: 999,
      subProjectName: '测试项目',
      finalAccountAmount: 100,
      payments: [{ amount: 30 }]
    })

    const project = getBootstrapData(db).projects.find((item) => item.id === 'p-test')

    expect(saved.id).toBe('p-test')
    expect(project.subProjectName).toBe('测试项目')
    expect(project.accumulatedPaymentAmount).toBe(30)
    expect(project.payments).toHaveLength(6)
  })

  test('stores handled warning state by id', () => {
    const db = testDb()
    updateWarningHandling(db, 'w1', { handler: '管理员', note: '已核对' })

    expect(getBootstrapData(db).handledWarnings.w1).toEqual({
      status: '已处理',
      handler: '管理员',
      note: '已核对'
    })
  })
})
