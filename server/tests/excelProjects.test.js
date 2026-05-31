import ExcelJS from 'exceljs'
import { describe, expect, test } from 'vitest'
import { openDatabase } from '../db/connection.js'
import { saveProjectRecord } from '../repositories/projectRepository.js'
import { applyProjectImport, buildProjectExportWorkbook, previewProjectImport } from '../services/excelProjects.js'

function testDb() {
  return openDatabase(':memory:')
}

describe('project excel service', () => {
  test('exports a workbook with project and payment columns', async () => {
    const db = testDb()
    saveProjectRecord(db, { id: 'p1', serialNo: 1, subProjectName: '导出项目', finalAccountAmount: 100, payments: [{ amount: 40 }] })

    const workbook = await buildProjectExportWorkbook(db)
    const sheet = workbook.getWorksheet('项目台账')
    const headers = sheet.getRow(1).values.slice(1)

    expect(headers).toContain('id')
    expect(headers).toContain('subProjectName')
    expect(headers).toContain('payment1Amount')
    expect(sheet.getRow(2).getCell('subProjectName').value).toBe('导出项目')
  })

  test('previews create and update rows before applying import', async () => {
    const db = testDb()
    saveProjectRecord(db, { id: 'p1', subProjectNo: 'A-001', subProjectName: '旧名称', payments: [] })
    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet('项目台账')
    sheet.addRow(['id', 'subProjectNo', 'subProjectName', 'finalAccountAmount', 'payment1Amount'])
    sheet.addRow(['', 'A-001', '新名称', 100, 30])
    sheet.addRow(['', 'A-002', '新增项目', 200, 80])
    const buffer = await workbook.xlsx.writeBuffer()

    const preview = await previewProjectImport(db, Buffer.from(buffer))

    expect(preview.createdCount).toBe(1)
    expect(preview.updatedCount).toBe(1)
    expect(preview.errors).toEqual([])
  })

  test('rejects invalid negative payment amount', async () => {
    const db = testDb()
    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet('项目台账')
    sheet.addRow(['subProjectName', 'payment1Amount'])
    sheet.addRow(['错误项目', -1])
    const buffer = await workbook.xlsx.writeBuffer()

    const preview = await previewProjectImport(db, Buffer.from(buffer))

    expect(preview.errors).toEqual([{ row: 2, message: 'payment1Amount cannot be below zero' }])
    expect(preview.createdCount).toBe(0)
  })

  test('applies valid import rows to the database', async () => {
    const db = testDb()
    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet('项目台账')
    sheet.addRow(['subProjectNo', 'subProjectName', 'finalAccountAmount', 'payment1Amount'])
    sheet.addRow(['A-003', '应用项目', 300, 120])
    const buffer = await workbook.xlsx.writeBuffer()

    const result = await applyProjectImport(db, Buffer.from(buffer))

    expect(result.createdCount).toBe(1)
    expect(result.errors).toEqual([])
  })
})
