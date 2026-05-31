import { createRouter, createWebHashHistory } from 'vue-router'
import { useProjectStore } from '../store/projectStore'
import MainLayout from '../layouts/MainLayout.vue'

const Login = () => import('../views/Login.vue')
const Dashboard = () => import('../views/Dashboard.vue')
const Users = () => import('../views/Users.vue')
const BasicData = () => import('../views/BasicData.vue')
const Projects = () => import('../views/Projects.vue')
const ProjectDetail = () => import('../views/ProjectDetail.vue')
const ProgressEntry = () => import('../views/ProgressEntry.vue')
const Tracking = () => import('../views/Tracking.vue')
const Reports = () => import('../views/Reports.vue')
const WarningCenter = () => import('../views/WarningCenter.vue')
const NotFound = () => import('../views/NotFound.vue')

const routes = [
  { path: '/login', name: 'login', component: Login, meta: { public: true, title: '系统登录' } },
  {
    path: '/',
    component: MainLayout,
    redirect: '/dashboard',
    children: [
      { path: 'dashboard', name: 'dashboard', component: Dashboard, meta: { title: '资金监管看板' } },
      { path: 'users', name: 'users', component: Users, meta: { title: '用户管理' } },
      { path: 'basic-data', name: 'basic-data', component: BasicData, meta: { title: '常用信息维护' } },
      { path: 'projects', name: 'projects', component: Projects, meta: { title: '项目资金台账' } },
      { path: 'projects/:id', name: 'project-detail', component: ProjectDetail, meta: { title: '项目台账详情' } },
      { path: 'progress', name: 'progress', component: ProgressEntry, meta: { title: '拨付与项目进度录入' } },
      { path: 'tracking', name: 'tracking', component: Tracking, meta: { title: '项目跟踪台账' } },
      { path: 'reports', name: 'reports', component: Reports, meta: { title: '资金查询统计' } },
      { path: 'warnings', name: 'warnings', component: WarningCenter, meta: { title: '资金与进度预警中心' } }
    ]
  },
  { path: '/:pathMatch(.*)*', name: 'not-found', component: NotFound }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

router.beforeEach((to) => {
  const store = useProjectStore()
  if (!to.meta.public && !store.isAuthenticated) return { path: '/login', query: { redirect: to.fullPath } }
  if (to.path === '/login' && store.isAuthenticated) return '/dashboard'
})

export default router
