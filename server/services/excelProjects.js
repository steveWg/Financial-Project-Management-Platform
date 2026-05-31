import ExcelJS from 'exceljs'
import { getBootstrapData, saveProjectRecord } from '../repositories/projectRepository.js'
import { normalizeProject, paymentLabels } from './projectNormalizer.js'

export const projectColumns = [
  'id',
  'serialNo',
  'constructionUnit',
  'mainProjectName',
  'subProjectNo',
  'subProjectName',
  'year',
  'projectCategory',
  'investmentAmount',
  'fundSource',
  'subsidyForm',
  'subsidyReceivable',
  'subsidyReceived',
  'accountingTreatment',
  'transferredExpenseAmount',
  'bidContractAmount',
  'winningOrContractAmount',
  'contractChangeAmount',
  'adjustmentRate',
  'finalAccountAmount',
  'superiorSubsidySource',
  'townFundSource',
  'townBudget2024',
  'projectProgress',
  'supplierInfo',
  'serviceContent',
  'remark',
  ...paymentLabels.flatMap((_, index) => [`payment${index + 1}Year`, `payment${index + 1}Date`, `payment${index + 1}Amount`])
]

function cellValueToString(value) {
  if (value == null) return ''
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  if (typeof value === 'object' && value.text) return value.text
  if (typeof value === 'object' && value.result != null) return String(value.result).trim()
  return String(value).trim()
}

function cellValueToNumber(value) {
  if (value === '' || value == null) return 0
  const number = Number(value)
  return Number.isFinite(number) ? number : NaN
}

async function parseRows(buffer) {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)
  const sheet = workbook.worksheets[0]
  if (!sheet) return []
  const headers = sheet.getRow(1).values.slice(1).map(cellValueToString)
  const rows = []
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return
    const item = {}
    headers.forEach((header, index) => {
      item[header] = row.getCell(index + 1).value ?? ''
    })
    rows.push({ rowNumber, item })
  })
  return rows
}

function rowToProject(row) {
  const project = {}
  projectColumns.forEach((column) => {
    if (column.startsWith('payment')) return
    if (row[column] !== undefined) project[column] = row[column]
  })

  ;[
    'id',
    'constructionUnit',
    'mainProjectName',
    'subProjectNo',
    'subProjectName',
    'projectCategory',
    'fundSource',
    'subsidyForm',
    'accountingTreatment',
    'projectProgress',
    'supplierInfo',
    'serviceContent',
    'remark'
  ].forEach((field) => {
    project[field] = cellValueToString(project[field])
  })

  ;[
    'serialNo',
    'year',
    'investmentAmount',
    'subsidyReceivable',
    'subsidyReceived',
    'transferredExpenseAmount',
    'bidContractAmount',
    'winningOrContractAmount',
    'contractChangeAmount',
    'adjustmentRate',
    'finalAccountAmount',
    'superiorSubsidySource',
    'townFundSource',
    'townBudget2024'
  ].forEach((field) => {
    project[field] = cellValueToNumber(project[field])
  })

  project.payments = paymentLabels.map((label, index) => ({
    label,
    paymentYear: cellValueToString(row[`payment${index + 1}Year`]),
    date: cellValueToString(row[`payment${index + 1}Date`]),
    amount: cellValueToNumber(row[`payment${index + 1}Amount`])
  }))

  return normalizeProject(project)
}

function validateProject(project) {
  const errors = []
  if (!project.subProjectName && !project.mainProjectName) errors.push('subProjectName or mainProjectName is required')
  project.payments.forEach((payment, index) => {
    if (Number.isNaN(payment.amount)) errors.push(`payment${index + 1}Amount must be a number`)
    if (payment.amount < 0) errors.push(`payment${index + 1}Amount cannot be below zero`)
  })
  return errors
}

function findExisting(projects, project) {
  if (project.id) return projects.find((item) => item.id === project.id)
  if (project.subProjectNo) return projects.find((item) => item.subProjectNo === project.subProjectNo)
  return null
}

export async function buildProjectExportWorkbook(db) {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('项目台账')
  sheet.columns = projectColumns.map((key) => ({ header: key, key, width: 20 }))
  getBootstrapData(db).projects.forEach((project) => {
    const row = { ...project }
    project.payments.forEach((payment, index) => {
      row[`payment${index + 1}Year`] = payment.paymentYear
      row[`payment${index + 1}Date`] = payment.date
      row[`payment${index + 1}Amount`] = payment.amount
    })
    sheet.addRow(row)
  })
  sheet.getRow(1).font = { bold: true }
  return workbook
}

export async function previewProjectImport(db, buffer) {
  const rows = await parseRows(buffer)
  const existingProjects = getBootstrapData(db).projects
  const errors = []
  const validRows = []
  let createdCount = 0
  let updatedCount = 0

  rows.forEach(({ rowNumber, item }) => {
    const project = rowToProject(item)
    const rowErrors = validateProject(project)
    if (rowErrors.length) {
      rowErrors.forEach((message) => errors.push({ row: rowNumber, message }))
      return
    }
    const existing = findExisting(existingProjects, project)
    validRows.push({
      action: existing ? 'update' : 'create',
      project: { ...existing, ...project, id: existing?.id || project.id || `p${Date.now()}${rowNumber}` }
    })
    if (existing) updatedCount += 1
    else createdCount += 1
  })

  return { createdCount, updatedCount, skippedCount: errors.length, errors, rows: validRows }
}

export async function applyProjectImport(db, buffer) {
  const preview = await previewProjectImport(db, buffer)
  if (preview.errors.length) return preview
  preview.rows.forEach(({ project }) => saveProjectRecord(db, project))
  return preview
}
