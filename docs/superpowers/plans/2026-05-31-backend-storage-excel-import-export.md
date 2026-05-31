# Backend Storage and Excel Import/Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a local Node/Express backend with SQLite persistence and Excel `.xlsx` project ledger import/export, then connect the Vue frontend to those APIs.

**Architecture:** Backend code lives under `server/`, with small modules for database schema, repositories, project normalization, Excel import/export, and HTTP routes. The frontend adds a narrow API client and changes the Pinia store from direct `localStorage` persistence to backend calls. Excel import is a two-step preview/apply flow.

**Tech Stack:** Vue 3, Pinia, Vite, Element Plus, Express, node:sqlite, ExcelJS, Multer, Vitest, Supertest.

---

## File Structure

- Modify `package.json`: add backend/test scripts and dependencies.
- Create `server/app.js`: Express app factory used by tests and runtime.
- Create `server/index.js`: starts the HTTP server and optionally serves `dist/`.
- Create `server/db/connection.js`: opens SQLite and initializes schema.
- Create `server/db/schema.js`: DDL for all backend tables.
- Create `server/db/seed.js`: seeds database from existing mock data.
- Create `server/services/projectNormalizer.js`: recalculates derived project fields.
- Create `server/repositories/projectRepository.js`: CRUD for projects, payments, logs, warnings, users, dictionaries.
- Create `server/services/excelProjects.js`: builds export workbooks, validates import workbooks, applies imports.
- Create `server/routes/api.js`: REST API route definitions.
- Create `server/tests/projectNormalizer.test.js`: normalization tests.
- Create `server/tests/database.test.js`: schema/bootstrap/repository tests.
- Create `server/tests/excelProjects.test.js`: Excel export/import tests.
- Create `server/tests/api.test.js`: API smoke tests.
- Create `src/api/client.js`: frontend API wrapper.
- Modify `src/store/projectStore.js`: bootstrap and save through API.
- Create `src/views/DataExchange.vue`: Excel import/export UI.
- Modify `src/router/index.js`: route for data exchange page.
- Modify `src/layouts/MainLayout.vue`: admin navigation item.

---

### Task 1: Add Backend and Test Tooling

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`

- [ ] **Step 1: Add dependencies**

Run:

```powershell
pnpm install --registry=https://registry.npmmirror.com
```

Expected: `package.json` and `package-lock.json` update with the new packages.

- [ ] **Step 2: Add scripts**

Modify `package.json` scripts to include:

```json
{
  "dev": "vite --host 0.0.0.0",
  "server": "node server/index.js",
  "dev:full": "concurrently \"pnpm:server\" \"pnpm:dev\"",
  "build": "vite build --configLoader native && node scripts/copy-404.js",
  "preview": "vite preview --host 0.0.0.0",
  "test:server": "vitest run server/tests --configLoader native",
  "test": "pnpm run test:server"
}
```

- [ ] **Step 3: Verify script discovery**

Run:

```powershell
pnpm run test:server
```

Expected: command runs and reports no test files found or fails only because test files do not exist yet. Do not create production code in this task.

- [ ] **Step 4: Commit**

```powershell
git add package.json package-lock.json
git commit -m "chore: add backend test tooling"
```

---

### Task 2: Project Normalization Service

**Files:**
- Create: `server/services/projectNormalizer.js`
- Test: `server/tests/projectNormalizer.test.js`

- [ ] **Step 1: Write failing tests**

Create `server/tests/projectNormalizer.test.js`:

```js
import { describe, expect, test } from 'vitest'
import { normalizeProject, paymentLabels } from '../services/projectNormalizer.js'

describe('normalizeProject', () => {
  test('fills six payment slots and recalculates derived financial fields', () => {
    const project = normalizeProject({
      finalAccountAmount: 1000,
      bidContractAmount: 1200,
      subsidyReceivable: 300,
      subsidyReceived: 120,
      superiorSubsidySource: 180,
      townFundSource: 100,
      townBudget2024: 250,
      payments: [
        { paymentYear: 2024, date: '2024-01-10', amount: 200 },
        { paymentYear: 2024, date: '2024-03-12', amount: 250 }
      ]
    })

    expect(project.payments).toHaveLength(6)
    expect(project.payments.map((item) => item.label)).toEqual(paymentLabels)
    expect(project.accumulatedPaymentAmount).toBe(450)
    expect(project.unpaidAmount).toBe(550)
    expect(project.paymentProgress).toBe(0.45)
    expect(project.subsidyUnreceived).toBe(180)
    expect(project.differenceAmount).toBe(30)
    expect(project.paymentCompleted).toBe('杩涜涓?)
  })

  test('marks payment completed when final amount is fully paid', () => {
    const project = normalizeProject({
      finalAccountAmount: 500,
      payments: [{ amount: 500 }]
    })

    expect(project.unpaidAmount).toBe(0)
    expect(project.paymentCompleted).toBe('瀹屾垚')
  })
})
```

- [ ] **Step 2: Run tests and verify RED**

Run:

```powershell
pnpm run test:server -- server/tests/projectNormalizer.test.js
```

Expected: FAIL because `server/services/projectNormalizer.js` does not exist.

- [ ] **Step 3: Implement minimal normalizer**

Create `server/services/projectNormalizer.js`:

```js
export const paymentLabels = ['绗竴娆℃敮浠?, '绗簩娆℃敮浠?, '绗笁娆℃敮浠?, '绗洓娆℃敮浠?, '绗簲娆℃敮浠?, '绗叚娆℃敮浠?]

const toNumber = (value) => {
  const number = Number(value || 0)
  return Number.isFinite(number) ? number : 0
}

export function normalizeProject(project = {}) {
  const payments = paymentLabels.map((label, index) => ({
    label,
    paymentYear: project.payments?.[index]?.paymentYear || '',
    date: project.payments?.[index]?.date || '',
    amount: toNumber(project.payments?.[index]?.amount)
  }))
  const accumulatedPaymentAmount = payments.reduce((sum, item) => sum + toNumber(item.amount), 0)
  const finalAccountAmount = toNumber(project.finalAccountAmount)
  const bidContractAmount = toNumber(project.bidContractAmount || project.winningOrContractAmount)
  const basisAmount = finalAccountAmount || bidContractAmount
  const unpaidAmount = Math.max(basisAmount - accumulatedPaymentAmount, 0)
  const paymentProgress = finalAccountAmount > 0 ? accumulatedPaymentAmount / finalAccountAmount : 0
  const subsidyUnreceived = Math.max(toNumber(project.subsidyReceivable) - toNumber(project.subsidyReceived), toNumber(project.subsidyUnreceived), 0)
  const differenceAmount = toNumber(project.superiorSubsidySource) + toNumber(project.townFundSource) - toNumber(project.townBudget2024)

  return {
    ...project,
    payments,
    accumulatedPaymentAmount,
    unpaidAmount,
    paymentProgress,
    subsidyUnreceived,
    differenceAmount,
    paymentCompleted: unpaidAmount <= 0 && finalAccountAmount > 0 ? '瀹屾垚' : project.paymentCompleted || '杩涜涓?
  }
}
```

- [ ] **Step 4: Run tests and verify GREEN**

Run:

```powershell
pnpm run test:server -- server/tests/projectNormalizer.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add server/services/projectNormalizer.js server/tests/projectNormalizer.test.js
git commit -m "feat: add project normalization service"
```

---

### Task 3: SQLite Schema, Connection, and Seed Data

**Files:**
- Create: `server/db/schema.js`
- Create: `server/db/connection.js`
- Create: `server/db/seed.js`
- Test: `server/tests/database.test.js`

- [ ] **Step 1: Write failing database tests**

Create `server/tests/database.test.js`:

```js
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'
import { openDatabase } from '../db/connection.js'
import { seedDatabase } from '../db/seed.js'

let tempDir

function testDb() {
  tempDir = mkdtempSync(join(tmpdir(), 'pm-db-'))
  return openDatabase(join(tempDir, 'test.db'))
}

afterEach(() => {
  if (tempDir) rmSync(tempDir, { recursive: true, force: true })
})

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
```

- [ ] **Step 2: Run tests and verify RED**

Run:

```powershell
pnpm run test:server -- server/tests/database.test.js
```

Expected: FAIL because database modules do not exist.

- [ ] **Step 3: Implement schema**

Create `server/db/schema.js` with:

```js
export const schemaSql = `
create table if not exists users (
  id text primary key,
  name text not null,
  account text not null unique,
  phone text,
  email text,
  department text,
  role text not null,
  status text not null,
  created_at text
);

create table if not exists dictionaries (
  id integer primary key autoincrement,
  type text not null,
  value text not null,
  unique(type, value)
);

create table if not exists projects (
  id text primary key,
  serial_no integer,
  construction_unit text,
  main_project_name text,
  sub_project_no text,
  sub_project_name text,
  year integer,
  project_category text,
  investment_amount real default 0,
  fund_source text,
  subsidy_form text,
  subsidy_receivable real default 0,
  subsidy_received real default 0,
  subsidy_unreceived real default 0,
  accounting_treatment text,
  transferred_expense_amount real default 0,
  bid_contract_amount real default 0,
  winning_or_contract_amount real default 0,
  contract_change_amount real default 0,
  adjustment_rate real default 0,
  final_account_amount real default 0,
  accumulated_payment_amount real default 0,
  unpaid_amount real default 0,
  payment_completed text,
  superior_subsidy_source real default 0,
  town_fund_source real default 0,
  town_budget_2024 real default 0,
  difference_amount real default 0,
  payment_progress real default 0,
  project_progress text,
  supplier_info text,
  service_content text,
  remark text
);

create table if not exists project_payments (
  id integer primary key autoincrement,
  project_id text not null references projects(id) on delete cascade,
  slot integer not null,
  label text not null,
  payment_year integer,
  date text,
  amount real default 0,
  unique(project_id, slot)
);

create table if not exists project_logs (
  id text primary key,
  project_id text not null references projects(id) on delete cascade,
  date text not null,
  author text,
  content text not null
);

create table if not exists warning_handlings (
  id text primary key,
  status text not null,
  handler text,
  note text
);
`
```

- [ ] **Step 4: Implement database connection**

Create `server/db/connection.js`:

```js
import { DatabaseSync } from 'node:sqlite'
import { dirname } from 'node:path'
import { mkdirSync } from 'node:fs'
import { schemaSql } from './schema.js'

export function openDatabase(filename) {
  mkdirSync(dirname(filename), { recursive: true })
  const db = new DatabaseSync(filename)
  db.exec('pragma foreign_keys = ON')
  db.exec(schemaSql)
  return db
}
```

- [ ] **Step 5: Implement seed**

Create `server/db/seed.js`:

```js
import { initialDictionaries, initialProjects, initialUsers } from '../../src/data/mock.js'
import { normalizeProject } from '../services/projectNormalizer.js'
import { saveProjectRecord } from '../repositories/projectRepository.js'

export function seedDatabase(db) {
  const existing = db.prepare('select count(*) as count from projects').get().count
  if (existing > 0) return

  const insertUser = db.prepare(`
    insert or ignore into users (id, name, account, phone, email, department, role, status, created_at)
    values (@id, @name, @account, @phone, @email, @department, @role, @status, @createdAt)
  `)
  const insertDictionary = db.prepare('insert or ignore into dictionaries (type, value) values (?, ?)')

  const transaction = db.transaction(() => {
    initialUsers.forEach((user) => insertUser.run(user))
    Object.entries(initialDictionaries).forEach(([type, values]) => {
      values.forEach((value) => insertDictionary.run(type, value))
    })
    initialProjects.map(normalizeProject).forEach((project) => saveProjectRecord(db, project))
  })

  transaction()
}
```

- [ ] **Step 6: Run tests and verify expected repository failure**

Run:

```powershell
pnpm run test:server -- server/tests/database.test.js
```

Expected: FAIL because `server/repositories/projectRepository.js` does not exist. This is the correct next dependency.

- [ ] **Step 7: Commit after Task 4 provides repository support**

Do not commit this task yet if tests fail due to missing repository support. Commit it together with Task 4 after GREEN.

---

### Task 4: Repository Layer and Bootstrap Data Shape

**Files:**
- Create: `server/repositories/projectRepository.js`
- Modify: `server/tests/database.test.js`

- [ ] **Step 1: Extend failing database tests**

Append these tests to `server/tests/database.test.js`:

```js
import { getBootstrapData, saveProjectRecord, updateWarningHandling } from '../repositories/projectRepository.js'

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
      subProjectName: '娴嬭瘯椤圭洰',
      finalAccountAmount: 100,
      payments: [{ amount: 30 }]
    })

    const data = getBootstrapData(db)
    const project = data.projects.find((item) => item.id === 'p-test')

    expect(saved.id).toBe('p-test')
    expect(project.subProjectName).toBe('娴嬭瘯椤圭洰')
    expect(project.accumulatedPaymentAmount).toBe(30)
    expect(project.payments).toHaveLength(6)
  })

  test('stores handled warning state by id', () => {
    const db = testDb()
    updateWarningHandling(db, 'w1', { handler: '绠＄悊鍛?, note: '宸叉牳瀵? })

    expect(getBootstrapData(db).handledWarnings.w1).toEqual({
      status: '宸插鐞?,
      handler: '绠＄悊鍛?,
      note: '宸叉牳瀵?
    })
  })
})
```

- [ ] **Step 2: Run tests and verify RED**

Run:

```powershell
pnpm run test:server -- server/tests/database.test.js
```

Expected: FAIL because repository exports do not exist.

- [ ] **Step 3: Implement repository layer**

Create `server/repositories/projectRepository.js` with these exports:

```js
import { normalizeProject, paymentLabels } from '../services/projectNormalizer.js'

const camelToDb = {
  serialNo: 'serial_no',
  constructionUnit: 'construction_unit',
  mainProjectName: 'main_project_name',
  subProjectNo: 'sub_project_no',
  subProjectName: 'sub_project_name',
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

const dbToCamel = Object.fromEntries(Object.entries(camelToDb).map(([camel, db]) => [db, camel]))

function projectRowToCamel(row) {
  const project = { id: row.id }
  Object.entries(row).forEach(([key, value]) => {
    if (key === 'id') return
    project[dbToCamel[key] || key] = value ?? ''
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
  const payments = db.prepare('select * from project_payments order by slot').all()
  const logs = db.prepare('select * from project_logs order by date desc').all()
  const projects = db.prepare('select * from projects order by serial_no, id').all().map((row) => {
    const project = projectRowToCamel(row)
    project.payments = payments.filter((item) => item.project_id === row.id).map((item) => ({
      label: item.label,
      paymentYear: item.payment_year || '',
      date: item.date || '',
      amount: Number(item.amount || 0)
    }))
    project.logs = logs.filter((item) => item.project_id === row.id).map((item) => ({
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

export function saveProjectRecord(db, payload) {
  const project = normalizeProject(payload)
  const fields = Object.entries(camelToDb)
  const columns = ['id', ...fields.map(([, column]) => column)]
  const values = ['@id', ...fields.map(([camel]) => `@${camel}`)]
  const updates = fields.map(([, column]) => `${column} = excluded.${column}`).join(', ')

  db.prepare(`
    insert into projects (${columns.join(', ')})
    values (${values.join(', ')})
    on conflict(id) do update set ${updates}
  `).run(project)

  const deletePayments = db.prepare('delete from project_payments where project_id = ?')
  const insertPayment = db.prepare(`
    insert into project_payments (project_id, slot, label, payment_year, date, amount)
    values (@projectId, @slot, @label, @paymentYear, @date, @amount)
  `)
  deletePayments.run(project.id)
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
    values (@id, '宸插鐞?, @handler, @note)
    on conflict(id) do update set status = '宸插鐞?, handler = excluded.handler, note = excluded.note
  `).run({ id, handler: payload.handler || '', note: payload.note || '' })
}
```

- [ ] **Step 4: Run database tests and verify GREEN**

Run:

```powershell
pnpm run test:server -- server/tests/database.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit Tasks 3 and 4**

```powershell
git add server/db server/repositories server/tests/database.test.js
git commit -m "feat: add sqlite persistence layer"
```

---

### Task 5: Excel Export, Preview, and Apply Services

**Files:**
- Create: `server/services/excelProjects.js`
- Test: `server/tests/excelProjects.test.js`

- [ ] **Step 1: Write failing Excel tests**

Create `server/tests/excelProjects.test.js`:

```js
import ExcelJS from 'exceljs'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'
import { openDatabase } from '../db/connection.js'
import { saveProjectRecord } from '../repositories/projectRepository.js'
import { applyProjectImport, buildProjectExportWorkbook, previewProjectImport } from '../services/excelProjects.js'

let tempDir

function testDb() {
  tempDir = mkdtempSync(join(tmpdir(), 'pm-excel-'))
  return openDatabase(join(tempDir, 'test.db'))
}

afterEach(() => {
  if (tempDir) rmSync(tempDir, { recursive: true, force: true })
})

describe('project excel service', () => {
  test('exports a workbook with project and payment columns', async () => {
    const db = testDb()
    saveProjectRecord(db, { id: 'p1', serialNo: 1, subProjectName: '瀵煎嚭椤圭洰', finalAccountAmount: 100, payments: [{ amount: 40 }] })

    const workbook = await buildProjectExportWorkbook(db)
    const sheet = workbook.getWorksheet('椤圭洰鍙拌处')
    const headers = sheet.getRow(1).values.slice(1)

    expect(headers).toContain('id')
    expect(headers).toContain('subProjectName')
    expect(headers).toContain('payment1Amount')
    expect(sheet.getRow(2).getCell('subProjectName').value).toBe('瀵煎嚭椤圭洰')
  })

  test('previews create and update rows before applying import', async () => {
    const db = testDb()
    saveProjectRecord(db, { id: 'p1', subProjectNo: 'A-001', subProjectName: '鏃у悕绉?, payments: [] })
    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet('椤圭洰鍙拌处')
    sheet.addRow(['id', 'subProjectNo', 'subProjectName', 'finalAccountAmount', 'payment1Amount'])
    sheet.addRow(['', 'A-001', '鏂板悕绉?, 100, 30])
    sheet.addRow(['', 'A-002', '鏂板椤圭洰', 200, 80])
    const buffer = await workbook.xlsx.writeBuffer()

    const preview = await previewProjectImport(db, Buffer.from(buffer))

    expect(preview.createdCount).toBe(1)
    expect(preview.updatedCount).toBe(1)
    expect(preview.errors).toEqual([])
  })

  test('rejects invalid negative payment amount', async () => {
    const db = testDb()
    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet('椤圭洰鍙拌处')
    sheet.addRow(['subProjectName', 'payment1Amount'])
    sheet.addRow(['閿欒椤圭洰', -1])
    const buffer = await workbook.xlsx.writeBuffer()

    const preview = await previewProjectImport(db, Buffer.from(buffer))

    expect(preview.errors).toEqual([{ row: 2, message: 'payment1Amount cannot be below zero' }])
    expect(preview.createdCount).toBe(0)
  })

  test('applies valid import rows to the database', async () => {
    const db = testDb()
    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet('椤圭洰鍙拌处')
    sheet.addRow(['subProjectNo', 'subProjectName', 'finalAccountAmount', 'payment1Amount'])
    sheet.addRow(['A-003', '搴旂敤椤圭洰', 300, 120])
    const buffer = await workbook.xlsx.writeBuffer()

    const result = await applyProjectImport(db, Buffer.from(buffer))

    expect(result.createdCount).toBe(1)
    expect(result.errors).toEqual([])
  })
})
```

- [ ] **Step 2: Run tests and verify RED**

Run:

```powershell
pnpm run test:server -- server/tests/excelProjects.test.js
```

Expected: FAIL because `excelProjects.js` does not exist.

- [ ] **Step 3: Implement Excel service**

Create `server/services/excelProjects.js` with these exports:

```js
import ExcelJS from 'exceljs'
import { getBootstrapData, saveProjectRecord } from '../repositories/projectRepository.js'
import { normalizeProject, paymentLabels } from './projectNormalizer.js'

export const projectColumns = [
  'id', 'serialNo', 'constructionUnit', 'mainProjectName', 'subProjectNo', 'subProjectName', 'year', 'projectCategory',
  'investmentAmount', 'fundSource', 'subsidyForm', 'subsidyReceivable', 'subsidyReceived', 'accountingTreatment',
  'transferredExpenseAmount', 'bidContractAmount', 'winningOrContractAmount', 'contractChangeAmount', 'adjustmentRate',
  'finalAccountAmount', 'superiorSubsidySource', 'townFundSource', 'townBudget2024', 'projectProgress', 'supplierInfo',
  'serviceContent', 'remark',
  ...paymentLabels.flatMap((_, index) => [`payment${index + 1}Year`, `payment${index + 1}Date`, `payment${index + 1}Amount`])
]

function rowToObject(row) {
  const values = {}
  row.eachCell((cell, colNumber) => {
    values[colNumber] = cell.value
  })
  return values
}

function valueToString(value) {
  if (value == null) return ''
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  if (typeof value === 'object' && value.text) return value.text
  return String(value).trim()
}

function valueToNumber(value) {
  if (value === '' || value == null) return 0
  const number = Number(value)
  return Number.isFinite(number) ? number : NaN
}

function parseWorksheet(buffer) {
  return new ExcelJS.Workbook().xlsx.load(buffer).then((workbook) => {
    const sheet = workbook.worksheets[0]
    const headerRow = sheet.getRow(1)
    const headers = headerRow.values.slice(1).map(valueToString)
    const rows = []
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return
      const cells = rowToObject(row)
      const item = {}
      headers.forEach((header, index) => {
        item[header] = cells[index + 1] ?? ''
      })
      rows.push({ rowNumber, item })
    })
    return rows
  })
}

function importRowToProject(row) {
  const project = {}
  projectColumns.forEach((column) => {
    if (column.startsWith('payment')) return
    if (row[column] !== undefined) project[column] = row[column]
  })
  project.id = valueToString(project.id)
  project.subProjectNo = valueToString(project.subProjectNo)
  project.subProjectName = valueToString(project.subProjectName)
  project.mainProjectName = valueToString(project.mainProjectName)
  project.payments = paymentLabels.map((label, index) => ({
    label,
    paymentYear: valueToString(row[`payment${index + 1}Year`]),
    date: valueToString(row[`payment${index + 1}Date`]),
    amount: valueToNumber(row[`payment${index + 1}Amount`])
  }))
  ;['serialNo', 'year', 'investmentAmount', 'subsidyReceivable', 'subsidyReceived', 'transferredExpenseAmount', 'bidContractAmount', 'winningOrContractAmount', 'contractChangeAmount', 'adjustmentRate', 'finalAccountAmount', 'superiorSubsidySource', 'townFundSource', 'townBudget2024'].forEach((field) => {
    project[field] = valueToNumber(project[field])
  })
  return normalizeProject(project)
}

function validateProjectRow(project) {
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
  const sheet = workbook.addWorksheet('椤圭洰鍙拌处')
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
  return workbook
}

export async function previewProjectImport(db, buffer) {
  const rows = await parseWorksheet(buffer)
  const existingProjects = getBootstrapData(db).projects
  const errors = []
  const validRows = []
  let createdCount = 0
  let updatedCount = 0

  rows.forEach(({ rowNumber, item }) => {
    const project = importRowToProject(item)
    const rowErrors = validateProjectRow(project)
    if (rowErrors.length) {
      rowErrors.forEach((message) => errors.push({ row: rowNumber, message }))
      return
    }
    const existing = findExisting(existingProjects, project)
    validRows.push({ action: existing ? 'update' : 'create', project: { ...existing, ...project, id: existing?.id || project.id || `p${Date.now()}${rowNumber}` } })
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
```

- [ ] **Step 4: Run tests and verify GREEN**

Run:

```powershell
pnpm run test:server -- server/tests/excelProjects.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add server/services/excelProjects.js server/tests/excelProjects.test.js
git commit -m "feat: add project excel import export"
```

---

### Task 6: Express API

**Files:**
- Create: `server/app.js`
- Create: `server/index.js`
- Create: `server/routes/api.js`
- Test: `server/tests/api.test.js`

- [ ] **Step 1: Write failing API tests**

Create `server/tests/api.test.js`:

```js
import request from 'supertest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'
import { createApp } from '../app.js'
import { openDatabase } from '../db/connection.js'
import { seedDatabase } from '../db/seed.js'

let tempDir

function app() {
  tempDir = mkdtempSync(join(tmpdir(), 'pm-api-'))
  const db = openDatabase(join(tempDir, 'test.db'))
  seedDatabase(db)
  return createApp({ db })
}

afterEach(() => {
  if (tempDir) rmSync(tempDir, { recursive: true, force: true })
})

describe('api', () => {
  test('GET /api/bootstrap returns frontend data', async () => {
    const response = await request(app()).get('/api/bootstrap').expect(200)

    expect(response.body.users.length).toBeGreaterThan(0)
    expect(response.body.projects.length).toBeGreaterThan(0)
  })

  test('POST /api/projects creates a normalized project', async () => {
    const response = await request(app())
      .post('/api/projects')
      .send({ subProjectName: '鎺ュ彛椤圭洰', finalAccountAmount: 100, payments: [{ amount: 20 }] })
      .expect(201)

    expect(response.body.project.subProjectName).toBe('鎺ュ彛椤圭洰')
    expect(response.body.project.accumulatedPaymentAmount).toBe(20)
  })

  test('POST /api/warnings/:id/handle stores handled warning', async () => {
    const response = await request(app())
      .post('/api/warnings/w1/handle')
      .send({ handler: '绠＄悊鍛?, note: '纭' })
      .expect(200)

    expect(response.body.handledWarnings.w1.status).toBe('宸插鐞?)
  })
})
```

- [ ] **Step 2: Run tests and verify RED**

Run:

```powershell
pnpm run test:server -- server/tests/api.test.js
```

Expected: FAIL because `server/app.js` does not exist.

- [ ] **Step 3: Implement API routes**

Create `server/routes/api.js`:

```js
import { Router } from 'express'
import multer from 'multer'
import { applyProjectImport, buildProjectExportWorkbook, previewProjectImport } from '../services/excelProjects.js'
import { getBootstrapData, saveProjectRecord, updateWarningHandling } from '../repositories/projectRepository.js'

const upload = multer({ storage: multer.memoryStorage() })

export function createApiRouter(db) {
  const router = Router()

  router.get('/bootstrap', (req, res) => res.json(getBootstrapData(db)))

  router.post('/projects', (req, res) => {
    const project = saveProjectRecord(db, { ...req.body, id: req.body.id || `p${Date.now()}` })
    res.status(201).json({ project, ...getBootstrapData(db) })
  })

  router.put('/projects/:id', (req, res) => {
    const project = saveProjectRecord(db, { ...req.body, id: req.params.id })
    res.json({ project, ...getBootstrapData(db) })
  })

  router.patch('/projects/:id/progress', (req, res) => {
    const current = getBootstrapData(db).projects.find((item) => item.id === req.params.id)
    if (!current) return res.status(404).json({ message: 'Project not found' })
    const logs = current.logs || []
    const project = saveProjectRecord(db, {
      ...current,
      ...req.body,
      logs: [
        {
          id: `l${Date.now()}`,
          date: new Date().toISOString().slice(0, 10),
          author: req.body.operator || '褰撳墠鐢ㄦ埛',
          content: `鏇存柊鎷ㄦ杩涘害鑷?${(((req.body.paymentProgress ?? current.paymentProgress) || 0) * 100).toFixed(2)}%锛岄」鐩繘搴︿负${req.body.projectProgress || current.projectProgress}銆俙
        },
        ...logs
      ]
    })
    res.json({ project, ...getBootstrapData(db) })
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
```

- [ ] **Step 4: Implement app and runtime**

Create `server/app.js`:

```js
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
```

Create `server/index.js`:

```js
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
```

- [ ] **Step 5: Run API tests and verify GREEN**

Run:

```powershell
pnpm run test:server -- server/tests/api.test.js
```

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add server/app.js server/index.js server/routes/api.js server/tests/api.test.js
git commit -m "feat: add backend api routes"
```

---

### Task 7: Frontend API Client and Store Integration

**Files:**
- Create: `src/api/client.js`
- Modify: `src/store/projectStore.js`

- [ ] **Step 1: Add API client**

Create `src/api/client.js`:

```js
const defaultBaseUrl = typeof window === 'undefined' ? 'http://localhost:3001' : `${window.location.protocol}//${window.location.hostname}:3001`
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || defaultBaseUrl

async function request(path, options = {}) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers: {
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(options.headers || {})
    }
  })
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: '璇锋眰澶辫触' }))
    throw new Error(error.message || '璇锋眰澶辫触')
  }
  return response.json()
}

export const apiClient = {
  bootstrap: () => request('/api/bootstrap'),
  createProject: (payload) => request('/api/projects', { method: 'POST', body: JSON.stringify(payload) }),
  updateProject: (id, payload) => request(`/api/projects/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  updateProjectProgress: (id, payload) => request(`/api/projects/${id}/progress`, { method: 'PATCH', body: JSON.stringify(payload) }),
  handleWarning: (id, payload) => request(`/api/warnings/${id}/handle`, { method: 'POST', body: JSON.stringify(payload) }),
  exportProjectsUrl: () => `${apiBaseUrl}/api/export/projects.xlsx`,
  previewProjectImport: (file) => {
    const form = new FormData()
    form.append('file', file)
    return request('/api/import/projects.xlsx/preview', { method: 'POST', body: form })
  },
  applyProjectImport: (file) => {
    const form = new FormData()
    form.append('file', file)
    return request('/api/import/projects.xlsx/apply', { method: 'POST', body: form })
  }
}
```

- [ ] **Step 2: Modify store for bootstrap and backend writes**

In `src/store/projectStore.js`:

```js
import { apiClient } from '../api/client'
```

Add state fields:

```js
const loading = ref(false)
const backendError = ref('')
```

Add helper:

```js
function applyRemoteState(payload) {
  state.value = {
    ...state.value,
    users: payload.users || state.value.users,
    dictionaries: payload.dictionaries || state.value.dictionaries,
    projects: (payload.projects || state.value.projects).map(normalizeProject),
    handledWarnings: payload.handledWarnings || state.value.handledWarnings
  }
  persist()
}
```

Add bootstrap action:

```js
async function loadRemoteState() {
  loading.value = true
  backendError.value = ''
  try {
    applyRemoteState(await apiClient.bootstrap())
  } catch (error) {
    backendError.value = error.message || '鍚庣鏈嶅姟杩炴帴澶辫触'
  } finally {
    loading.value = false
  }
}
```

Change `saveProject`, `saveProjectProgress`, and `handleWarning` to `async` functions that call the API and then `applyRemoteState(response)`. Keep the current local mutation as fallback only when `backendError.value` is set and the backend call fails again.

Return `loading`, `backendError`, `loadRemoteState`, and existing actions from the store.

- [ ] **Step 3: Bootstrap on app start**

Modify `src/App.vue` or `src/main.js` so that after Pinia is created, the app calls `useProjectStore().loadRemoteState()` once. If doing it in `src/App.vue`, use:

```js
import { onMounted } from 'vue'
import { useProjectStore } from './store/projectStore'

const store = useProjectStore()
onMounted(() => store.loadRemoteState())
```

- [ ] **Step 4: Manual verification**

Run backend and frontend:

```powershell
pnpm run dev:full
```

Expected:

- Backend starts on port `3001`.
- Frontend starts on Vite port.
- Existing dashboard loads data from the backend.
- If backend is stopped, the UI exposes `backendError` where wired in Task 8.

- [ ] **Step 5: Commit**

```powershell
git add src/api/client.js src/store/projectStore.js src/App.vue src/main.js
git commit -m "feat: connect frontend store to backend api"
```

---

### Task 8: Data Import/Export UI and Navigation

**Files:**
- Create: `src/views/DataExchange.vue`
- Modify: `src/router/index.js`
- Modify: `src/layouts/MainLayout.vue`
- Modify: `src/store/projectStore.js`

- [ ] **Step 1: Add store import/export actions**

In `src/store/projectStore.js`, add:

```js
async function previewProjectImport(file) {
  return apiClient.previewProjectImport(file)
}

async function applyProjectImport(file) {
  const result = await apiClient.applyProjectImport(file)
  await loadRemoteState()
  return result
}
```

Return both actions.

- [ ] **Step 2: Create DataExchange view**

Create `src/views/DataExchange.vue`:

```vue
<script setup>
import { ref } from 'vue'
import { Download, Upload } from '@lucide/vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { apiClient } from '../api/client'
import { useProjectStore } from '../store/projectStore'

const store = useProjectStore()
const selectedFile = ref(null)
const preview = ref(null)
const importing = ref(false)

function downloadProjects() {
  window.location.href = apiClient.exportProjectsUrl()
}

async function handleFileChange(file) {
  selectedFile.value = file.raw
  preview.value = null
  if (!selectedFile.value) return
  importing.value = true
  try {
    preview.value = await store.previewProjectImport(selectedFile.value)
  } catch (error) {
    ElMessage.error(error.message || 'Excel 鏍￠獙澶辫触')
  } finally {
    importing.value = false
  }
}

async function applyImport() {
  if (!selectedFile.value || !preview.value) return
  if (preview.value.errors?.length) {
    ElMessage.error('璇峰厛淇 Excel 閿欒鍚庡啀瀵煎叆')
    return
  }
  await ElMessageBox.confirm('纭灏嗛瑙堜腑鐨勯」鐩彴璐﹀啓鍏ユ暟鎹簱锛?, '纭瀵煎叆', { type: 'warning' })
  importing.value = true
  try {
    preview.value = await store.applyProjectImport(selectedFile.value)
    ElMessage.success('瀵煎叆瀹屾垚')
  } catch (error) {
    ElMessage.error(error.message || '瀵煎叆澶辫触')
  } finally {
    importing.value = false
  }
}
</script>

<template>
  <section class="page-section">
    <div class="section-header">
      <div>
        <h2>鏁版嵁瀵煎叆瀵煎嚭</h2>
        <p>瀵煎嚭椤圭洰鍙拌处 Excel锛屾垨涓婁紶 Excel 鏍￠獙鍚庡啓鍏ユ湰鍦版暟鎹簱銆?/p>
      </div>
      <el-button type="primary" :icon="Download" @click="downloadProjects">瀵煎嚭椤圭洰鍙拌处</el-button>
    </div>

    <el-alert v-if="store.backendError" :title="store.backendError" type="error" show-icon />

    <div class="toolbar-panel">
      <el-upload accept=".xlsx" :auto-upload="false" :show-file-list="true" :limit="1" @change="handleFileChange">
        <el-button :icon="Upload">閫夋嫨 Excel 鏂囦欢</el-button>
      </el-upload>
      <el-button type="success" :disabled="!preview || preview.errors?.length || importing" :loading="importing" @click="applyImport">纭瀵煎叆</el-button>
    </div>

    <el-descriptions v-if="preview" :column="4" border>
      <el-descriptions-item label="鏂板">{{ preview.createdCount }}</el-descriptions-item>
      <el-descriptions-item label="鏇存柊">{{ preview.updatedCount }}</el-descriptions-item>
      <el-descriptions-item label="璺宠繃">{{ preview.skippedCount }}</el-descriptions-item>
      <el-descriptions-item label="閿欒">{{ preview.errors?.length || 0 }}</el-descriptions-item>
    </el-descriptions>

    <el-table v-if="preview?.errors?.length" :data="preview.errors" border>
      <el-table-column prop="row" label="琛屽彿" width="100" />
      <el-table-column prop="message" label="閿欒鍘熷洜" />
    </el-table>
  </section>
</template>
```

- [ ] **Step 3: Add route**

In `src/router/index.js`:

```js
const DataExchange = () => import('../views/DataExchange.vue')
```

Add child route:

```js
{ path: 'data-exchange', name: 'data-exchange', component: DataExchange, meta: { title: '鏁版嵁瀵煎叆瀵煎嚭' } }
```

- [ ] **Step 4: Add navigation item**

In `src/layouts/MainLayout.vue`, import a suitable lucide icon:

```js
import { Download } from '@lucide/vue'
```

Add admin role permission:

```js
绠＄悊鍛? ['dashboard', 'users', 'basic-data', 'projects', 'progress', 'tracking', 'reports', 'warnings', 'data-exchange']
```

Add menu item:

```js
{ key: 'data-exchange', path: '/data-exchange', label: '鏁版嵁瀵煎叆瀵煎嚭', icon: Download }
```

- [ ] **Step 5: Run build**

Run:

```powershell
pnpm run build
```

Expected: Vite build passes.

- [ ] **Step 6: Commit**

```powershell
git add src/views/DataExchange.vue src/router/index.js src/layouts/MainLayout.vue src/store/projectStore.js
git commit -m "feat: add excel data exchange UI"
```

---

### Task 9: End-to-End Verification and Documentation

**Files:**
- Modify: `README.md` if it exists, otherwise create `README.md`

- [ ] **Step 1: Add local run instructions**

Create or update `README.md` with:

````md
# Financial Project Management Platform

## Local Full-Stack Run

Install dependencies:

```powershell
pnpm install
```

Start backend and frontend:

```powershell
pnpm run dev:full
```

Backend defaults to `http://localhost:3001`.
Frontend defaults to the Vite URL printed in the terminal.
SQLite data is stored at `server/data/project-management.db`.

## Excel Import/Export

Open the app as an admin user and go to `鏁版嵁瀵煎叆瀵煎嚭`.

- Use `瀵煎嚭椤圭洰鍙拌处` to download the current project ledger.
- Use `閫夋嫨 Excel 鏂囦欢` to upload `.xlsx`.
- Review validation results.
- Click `纭瀵煎叆` to write valid rows to SQLite.
````

- [ ] **Step 2: Run full test suite**

Run:

```powershell
pnpm test
```

Expected: all server tests PASS.

- [ ] **Step 3: Run production build**

Run:

```powershell
pnpm run build
```

Expected: Vite build passes and `dist/` is created.

- [ ] **Step 4: Smoke test local full stack**

Run:

```powershell
pnpm run dev:full
```

Open the Vite URL in the browser and verify:

- Dashboard data loads.
- Project edit/save persists after refresh.
- Data import/export page is available to admin.
- Export downloads `.xlsx`.
- Uploading the exported file previews rows without errors.
- Confirming import completes and data reloads.

- [ ] **Step 5: Commit**

```powershell
git add README.md
git commit -m "docs: add local backend run instructions"
```

---

## Self-Review

Spec coverage:

- Local Express backend: Tasks 1, 6, 9.
- SQLite persistence: Tasks 3, 4.
- API for current app behavior: Tasks 4, 6, 7.
- Excel project ledger import/export: Tasks 5, 8.
- Frontend API integration: Tasks 7, 8.
- Preview-before-apply import: Tasks 5, 6, 8.
- Testing: Tasks 2 through 6 and Task 9.

Placeholder scan:

- No unresolved markers or unspecified implementation steps remain.

Type consistency:

- Backend APIs use `/api/import/projects.xlsx/preview` and `/api/import/projects.xlsx/apply`.
- Frontend `apiClient` uses the same paths.
- Store and view actions use `previewProjectImport` and `applyProjectImport` consistently.



