import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { apiClient } from '../api/client'
import { initialDictionaries, initialProjects, initialUsers, paymentLabels } from '../data/mock'
import { buildWarnings } from '../utils/warnings'

const clone = (value) => JSON.parse(JSON.stringify(value))
const storageKey = 'pm-finance-state-v2'

function normalizeProject(project) {
  const payments = paymentLabels.map((label, index) => ({
    label,
    paymentYear: project.payments?.[index]?.paymentYear || '',
    date: project.payments?.[index]?.date || '',
    amount: Number(project.payments?.[index]?.amount || 0)
  }))
  const accumulatedPaymentAmount = payments.reduce((sum, item) => sum + Number(item.amount || 0), 0)
  const finalAccountAmount = Number(project.finalAccountAmount || 0)
  const bidContractAmount = Number(project.bidContractAmount || project.winningOrContractAmount || 0)
  const unpaidAmount = Math.max((finalAccountAmount || bidContractAmount) - accumulatedPaymentAmount, 0)
  const paymentProgress = finalAccountAmount > 0 ? accumulatedPaymentAmount / finalAccountAmount : 0
  const subsidyUnreceived = Math.max(Number(project.subsidyReceivable || 0) - Number(project.subsidyReceived || 0), Number(project.subsidyUnreceived || 0), 0)
  const differenceAmount = Number(project.superiorSubsidySource || 0) + Number(project.townFundSource || 0) - Number(project.townBudget2024 || 0)

  return {
    ...project,
    payments,
    accumulatedPaymentAmount,
    unpaidAmount,
    paymentProgress,
    subsidyUnreceived,
    differenceAmount,
    paymentCompleted: unpaidAmount <= 0 && finalAccountAmount > 0 ? '完成' : project.paymentCompleted || '进行中'
  }
}

function defaultState() {
  return {
    users: clone(initialUsers),
    dictionaries: clone(initialDictionaries),
    projects: clone(initialProjects).map(normalizeProject),
    handledWarnings: {},
    session: null
  }
}

function readState() {
  const raw = localStorage.getItem(storageKey)
  if (!raw) return defaultState()

  try {
    const state = { ...defaultState(), ...JSON.parse(raw) }
    state.projects = (state.projects || []).map(normalizeProject)
    return state
  } catch {
    localStorage.removeItem(storageKey)
    return defaultState()
  }
}

export const useProjectStore = defineStore('project-store', () => {
  const state = ref(readState())
  const currentRole = ref(state.value.session?.role || '管理员')
  const loading = ref(false)
  const backendError = ref('')

  const users = computed(() => state.value.users)
  const dictionaries = computed(() => state.value.dictionaries)
  const projects = computed(() => state.value.projects)
  const currentUser = computed(() => state.value.session)
  const isAuthenticated = computed(() => Boolean(state.value.session))
  const warnings = computed(() =>
    buildWarnings(state.value.projects).map((warning) => ({
      ...warning,
      ...(state.value.handledWarnings[warning.id] || {})
    }))
  )
  const pendingWarnings = computed(() => warnings.value.filter((item) => item.status === '待处理'))
  const totals = computed(() => calculateTotals(projects.value))

  function calculateTotals(list) {
    const sum = (field) => list.reduce((total, item) => total + Number(item[field] || 0), 0)
    const finalAmount = sum('finalAccountAmount')
    const paidAmount = sum('accumulatedPaymentAmount')

    return {
      projectCount: list.length,
      investmentAmount: sum('investmentAmount'),
      finalAccountAmount: finalAmount,
      accumulatedPaymentAmount: paidAmount,
      unpaidAmount: sum('unpaidAmount'),
      subsidyUnreceived: sum('subsidyUnreceived'),
      paymentProgress: finalAmount ? paidAmount / finalAmount : 0,
      inProgressCount: list.filter((item) => item.projectProgress === '进行中').length,
      unfinishedCount: list.filter((item) => item.projectProgress === '未完成').length
    }
  }

  function persist() {
    localStorage.setItem(storageKey, JSON.stringify(state.value))
  }

  function nextId(prefix, list) {
    return `${prefix}${Date.now()}${list.length}`
  }

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

  async function loadRemoteState() {
    loading.value = true
    backendError.value = ''
    try {
      applyRemoteState(await apiClient.bootstrap())
    } catch (error) {
      backendError.value = error.message || '后端服务连接失败'
    } finally {
      loading.value = false
    }
  }

  function login({ account, role }) {
    const matched = state.value.users.find((item) => item.account === account && item.status === '启用') || state.value.users.find((item) => item.role === role)
    const user = matched || state.value.users[0]
    state.value.session = {
      id: user.id,
      name: user.name,
      account: user.account,
      department: user.department,
      role: role || user.role
    }
    currentRole.value = state.value.session.role
    persist()
  }

  function logout() {
    state.value.session = null
    persist()
  }

  async function saveUser(payload) {
    try {
      const response = payload.id ? await apiClient.updateUser(payload.id, payload) : await apiClient.createUser(payload)
      applyRemoteState(response)
    } catch (error) {
      backendError.value = error.message || '后端服务连接失败'
      if (payload.id) state.value.users = state.value.users.map((item) => (item.id === payload.id ? { ...item, ...payload } : item))
      else state.value.users.unshift({ ...payload, id: nextId('u', state.value.users), createdAt: new Date().toISOString().slice(0, 10) })
      persist()
    }
  }

  async function toggleUserStatus(user) {
    const status = user.status === '启用' ? '停用' : '启用'
    try {
      applyRemoteState(await apiClient.updateUserStatus(user.id, status))
    } catch (error) {
      backendError.value = error.message || '后端服务连接失败'
      user.status = status
      persist()
    }
  }

  async function addDictionaryItem(type, value) {
    if (!value || !state.value.dictionaries[type] || state.value.dictionaries[type].includes(value)) return
    try {
      applyRemoteState(await apiClient.addDictionaryItem(type, value))
    } catch (error) {
      backendError.value = error.message || '后端服务连接失败'
      state.value.dictionaries[type].push(value)
      persist()
    }
  }

  async function removeDictionaryItem(type, value) {
    try {
      applyRemoteState(await apiClient.removeDictionaryItem(type, value))
    } catch (error) {
      backendError.value = error.message || '后端服务连接失败'
      state.value.dictionaries[type] = state.value.dictionaries[type].filter((item) => item !== value)
      persist()
    }
  }

  async function saveProject(payload) {
    try {
      const response = payload.id ? await apiClient.updateProject(payload.id, payload) : await apiClient.createProject(payload)
      applyRemoteState(response)
    } catch (error) {
      backendError.value = error.message || '后端服务连接失败'
      const normalized = normalizeProject(payload)
      if (payload.id) {
        state.value.projects = state.value.projects.map((item) => (item.id === payload.id ? { ...item, ...normalized } : item))
      } else {
        state.value.projects.unshift(
          normalizeProject({
            ...normalized,
            id: nextId('p', state.value.projects),
            serialNo: Math.max(...state.value.projects.map((item) => Number(item.serialNo || 0)), 0) + 1,
            logs: []
          })
        )
      }
      persist()
    }
  }

  function findProject(projectId) {
    return state.value.projects.find((item) => item.id === projectId)
  }

  async function saveProjectProgress(projectId, payload) {
    const project = findProject(projectId)
    if (!project) return

    try {
      applyRemoteState(await apiClient.updateProjectProgress(projectId, payload))
    } catch (error) {
      backendError.value = error.message || '后端服务连接失败'
      Object.assign(project, normalizeProject({ ...project, ...payload }))
      project.logs = project.logs || []
      project.logs.unshift({
        id: nextId('l', project.logs),
        date: new Date().toISOString().slice(0, 10),
        author: payload.operator || currentUser.value?.name || '当前用户',
        content: `更新拨款进度至 ${(project.paymentProgress * 100).toFixed(2)}%，项目进度为${project.projectProgress}。`
      })
      persist()
    }
  }

  async function handleWarning(id, payload) {
    try {
      applyRemoteState(await apiClient.handleWarning(id, payload))
    } catch (error) {
      backendError.value = error.message || '后端服务连接失败'
      state.value.handledWarnings[id] = {
        status: '已处理',
        handler: payload.handler,
        note: payload.note
      }
      persist()
    }
  }

  async function previewProjectImport(file) {
    return apiClient.previewProjectImport(file)
  }

  async function applyProjectImport(file) {
    const result = await apiClient.applyProjectImport(file)
    await loadRemoteState()
    return result
  }

  return {
    currentRole,
    currentUser,
    isAuthenticated,
    users,
    dictionaries,
    projects,
    warnings,
    pendingWarnings,
    totals,
    loading,
    backendError,
    calculateTotals,
    loadRemoteState,
    login,
    logout,
    saveUser,
    toggleUserStatus,
    addDictionaryItem,
    removeDictionaryItem,
    saveProject,
    findProject,
    saveProjectProgress,
    handleWarning,
    previewProjectImport,
    applyProjectImport
  }
})
