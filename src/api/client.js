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
    const error = await response.json().catch(() => ({ message: '请求失败' }))
    throw new Error(error.message || '请求失败')
  }
  return response.json()
}

export const apiClient = {
  bootstrap: () => request('/api/bootstrap'),
  createUser: (payload) => request('/api/users', { method: 'POST', body: JSON.stringify(payload) }),
  updateUser: (id, payload) => request(`/api/users/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  updateUserStatus: (id, status) => request(`/api/users/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  addDictionaryItem: (type, value) => request(`/api/dictionaries/${type}`, { method: 'POST', body: JSON.stringify({ value }) }),
  removeDictionaryItem: (type, value) => request(`/api/dictionaries/${type}/${encodeURIComponent(value)}`, { method: 'DELETE' }),
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
