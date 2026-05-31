<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Bell, ChartColumn, ChevronLeft, ChevronRight, ClipboardList, Database, Download, Gauge, LayoutDashboard, LogOut, Search, Users } from '@lucide/vue'
import { useProjectStore } from '../store/projectStore'

const route = useRoute()
const router = useRouter()
const store = useProjectStore()
const collapsed = ref(localStorage.getItem('pm-sidebar-collapsed') === 'true')

const title = computed(() => route.meta.title || '工程建设项目资金监管平台')
const roleMenus = {
  管理员: ['dashboard', 'users', 'basic-data', 'projects', 'progress', 'tracking', 'reports', 'warnings', 'data-exchange'],
  '财政/项目主管': ['dashboard', 'projects', 'progress', 'tracking', 'reports', 'warnings'],
  录入人员: ['dashboard', 'projects', 'progress', 'tracking', 'warnings'],
  查看人员: ['dashboard', 'tracking', 'reports', 'warnings']
}
const menus = [
  { key: 'dashboard', path: '/dashboard', label: '资金看板', icon: LayoutDashboard },
  { key: 'users', path: '/users', label: '用户管理', icon: Users },
  { key: 'basic-data', path: '/basic-data', label: '常用信息维护', icon: Database },
  { key: 'projects', path: '/projects', label: '项目资金台账', icon: ClipboardList },
  { key: 'progress', path: '/progress', label: '拨付进度录入', icon: Gauge },
  { key: 'tracking', path: '/tracking', label: '项目跟踪', icon: Search },
  { key: 'reports', path: '/reports', label: '查询统计', icon: ChartColumn },
  { key: 'warnings', path: '/warnings', label: '预警中心', icon: Bell },
  { key: 'data-exchange', path: '/data-exchange', label: '数据导入导出', icon: Download }
]

const visibleMenus = computed(() => {
  const allowed = roleMenus[store.currentRole] || roleMenus['管理员']
  return menus.filter((item) => allowed.includes(item.key))
})
const asideWidth = computed(() => (collapsed.value ? '72px' : '236px'))

watch(collapsed, (value) => localStorage.setItem('pm-sidebar-collapsed', String(value)))

function logout() {
  store.logout()
  router.replace('/login')
}
</script>

<template>
  <el-container class="app-shell">
    <el-aside class="sidebar" :class="{ collapsed }" :width="asideWidth">
      <div class="brand">
        <div class="brand-mark">资</div>
        <div v-if="!collapsed" class="brand-text">
          <strong>资金监管平台</strong>
          <span>Project Finance Control</span>
        </div>
      </div>
      <el-menu class="side-menu" :default-active="route.path" :collapse="collapsed" router>
        <el-menu-item v-for="item in visibleMenus" :key="item.key" :index="item.path">
          <component :is="item.icon" class="menu-icon" />
          <template #title>{{ item.label }}</template>
        </el-menu-item>
      </el-menu>
      <button class="sidebar-toggle" type="button" :title="collapsed ? '展开侧边栏' : '收起侧边栏'" @click="collapsed = !collapsed">
        <ChevronRight v-if="collapsed" :size="18" />
        <ChevronLeft v-else :size="18" />
      </button>
    </el-aside>

    <el-container>
      <el-header class="topbar">
        <div>
          <div class="page-title">{{ title }}</div>
          <div class="page-subtitle">数据口径：项目支出明细表 | 金额单位：元</div>
        </div>
        <div class="topbar-actions">
          <el-alert v-if="store.backendError" class="backend-alert" :title="store.backendError" type="warning" show-icon :closable="false" />
          <el-badge :value="store.pendingWarnings.length" class="warning-badge">
            <el-button :icon="Bell" circle @click="router.push('/warnings')" />
          </el-badge>
          <el-select v-model="store.currentRole" class="role-select" size="small">
            <el-option label="管理员" value="管理员" />
            <el-option label="财政/项目主管" value="财政/项目主管" />
            <el-option label="录入人员" value="录入人员" />
            <el-option label="查看人员" value="查看人员" />
          </el-select>
          <el-dropdown>
            <span class="user-chip">
              <el-avatar size="small">{{ store.currentUser?.name?.slice(0, 1) || '资' }}</el-avatar>
              <span>{{ store.currentUser?.name || '当前用户' }}</span>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item :icon="LogOut" @click="logout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>
      <el-main class="content">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>
