import { normalizeProject, paymentLabels } from '../services/projectNormalizer.js'

const projectFields = {
  serialNo: 'serial_no',
  constructionUnit: 'construction_unit',
  mainProjectName: 'main_project_name',
  subProjectNo: 'sub_project_no',
  subProjectName: 'sub_project_name',
  year: 'year',
  projectCategory: 'project_category',
  investmentAmount: 'investment_amount',
  fundSource: 'fund_source',
  subsidyForm: 'subsidy_form',
  subsidyReceivable: 'subsidy_receivable',
  subsidyReceived: 'subsidy_received',
  subsidyUnreceived: 'subsidy_unreceived',
  accountingTreatment: 'accounting_treatment',
  transferredExpenseAmount: 'transferred_expense_amount',
  bidContractAmount: 'bid_contract_amount',
  winningOrContractAmount: 'winning_or_contract_amount',
  contractChangeAmount: 'contract_change_amount',
  adjustmentRate: 'adjustment_rate',
  finalAccountAmount: 'final_account_amount',
  accumulatedPaymentAmount: 'accumulated_payment_amount',
  unpaidAmount: 'unpaid_amount',
  paymentCompleted: 'payment_completed',
  superiorSubsidySource: 'superior_subsidy_source',
  townFundSource: 'town_fund_source',
  townBudget2024: 'town_budget_2024',
  differenceAmount: 'difference_amount',
  paymentProgress: 'payment_progress',
  projectProgress: 'project_progress',
  supplierInfo: 'supplier_info',
  serviceContent: 'service_content',
  remark: 'remark'
}

const dbFields = Object.fromEntries(Object.entries(projectFields).map(([camel, db]) => [db, camel]))

function projectRowToCamel(row) {
  const project = { id: row.id }
  Object.entries(row).forEach(([key, value]) => {
    if (key === 'id') return
    project[dbFields[key] || key] = value ?? ''
  })
  return project
}

function userRowToCamel(row) {
  return {
    id: row.id,
    name: row.name,
    account: row.account,
    phone: row.phone || '',
    email: row.email || '',
    department: row.department || '',
    role: row.role,
    status: row.status,
    createdAt: row.created_at || ''
  }
}

export function getBootstrapData(db) {
  const users = db.prepare('select * from users order by created_at, id').all().map(userRowToCamel)
  const dictionaries = {}
  db.prepare('select type, value from dictionaries order by id').all().forEach((row) => {
    dictionaries[row.type] ||= []
    dictionaries[row.type].push(row.value)
  })
  const paymentRows = db.prepare('select * from project_payments order by slot').all()
  const logRows = db.prepare('select * from project_logs order by date desc').all()
  const projects = db.prepare('select * from projects order by serial_no, id').all().map((row) => {
    const project = projectRowToCamel(row)
    project.payments = paymentRows.filter((item) => item.project_id === row.id).map((item) => ({
      label: item.label,
      paymentYear: item.payment_year || '',
      date: item.date || '',
      amount: Number(item.amount || 0)
    }))
    project.logs = logRows.filter((item) => item.project_id === row.id).map((item) => ({
      id: item.id,
      date: item.date,
      author: item.author || '',
      content: item.content
    }))
    return normalizeProject(project)
  })
  const handledWarnings = {}
  db.prepare('select * from warning_handlings').all().forEach((row) => {
    handledWarnings[row.id] = { status: row.status, handler: row.handler || '', note: row.note || '' }
  })

  return { users, dictionaries, projects, handledWarnings }
}

export function saveUserRecord(db, payload) {
  const user = { ...payload, id: payload.id || `u${Date.now()}`, createdAt: payload.createdAt || new Date().toISOString().slice(0, 10) }
  db.prepare(`
    insert into users (id, name, account, phone, email, department, role, status, created_at)
    values (@id, @name, @account, @phone, @email, @department, @role, @status, @createdAt)
    on conflict(id) do update set
      name = excluded.name,
      account = excluded.account,
      phone = excluded.phone,
      email = excluded.email,
      department = excluded.department,
      role = excluded.role,
      status = excluded.status
  `).run(user)
  return user
}

export function setUserStatus(db, id, status) {
  db.prepare('update users set status = ? where id = ?').run(status, id)
}

export function addDictionaryValue(db, type, value) {
  db.prepare('insert or ignore into dictionaries (type, value) values (?, ?)').run(type, value)
}

export function removeDictionaryValue(db, type, value) {
  db.prepare('delete from dictionaries where type = ? and value = ?').run(type, value)
}

export function saveProjectRecord(db, payload) {
  const project = normalizeProject({ ...payload, id: payload.id || `p${Date.now()}` })
  const fields = Object.entries(projectFields)
  const columns = ['id', ...fields.map(([, column]) => column)]
  const values = ['@id', ...fields.map(([camel]) => `@${camel}`)]
  const updates = fields.map(([, column]) => `${column} = excluded.${column}`).join(', ')
  const record = { id: project.id }
  fields.forEach(([camel]) => {
    record[camel] = project[camel] ?? null
  })

  db.prepare(`
    insert into projects (${columns.join(', ')})
    values (${values.join(', ')})
    on conflict(id) do update set ${updates}
  `).run(record)

  db.prepare('delete from project_payments where project_id = ?').run(project.id)
  const insertPayment = db.prepare(`
    insert into project_payments (project_id, slot, label, payment_year, date, amount)
    values (@projectId, @slot, @label, @paymentYear, @date, @amount)
  `)
  project.payments.forEach((payment, index) => {
    insertPayment.run({
      projectId: project.id,
      slot: index + 1,
      label: payment.label || paymentLabels[index],
      paymentYear: payment.paymentYear || null,
      date: payment.date || '',
      amount: Number(payment.amount || 0)
    })
  })

  if (Array.isArray(project.logs)) {
    const insertLog = db.prepare('insert or ignore into project_logs (id, project_id, date, author, content) values (@id, @projectId, @date, @author, @content)')
    project.logs.forEach((log) => insertLog.run({ ...log, projectId: project.id }))
  }

  return project
}

export function updateWarningHandling(db, id, payload) {
  db.prepare(`
    insert into warning_handlings (id, status, handler, note)
    values (@id, '已处理', @handler, @note)
    on conflict(id) do update set status = '已处理', handler = excluded.handler, note = excluded.note
  `).run({ id, handler: payload.handler || '', note: payload.note || '' })
}
