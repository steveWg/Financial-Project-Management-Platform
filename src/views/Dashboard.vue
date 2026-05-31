<script setup>
import { computed, reactive } from 'vue'
import ChartBox from '../components/ChartBox.vue'
import MetricCard from '../components/MetricCard.vue'
import StatusTag from '../components/StatusTag.vue'
import { useProjectStore } from '../store/projectStore'
import { buildWarnings } from '../utils/warnings'

const store = useProjectStore()
const filters = reactive({
  asOfDate: '2026-05-31',
  year: '',
  constructionUnit: '',
  fundSource: '',
  projectProgress: ''
})

const money = (value) => Number(value || 0).toLocaleString('zh-CN', { maximumFractionDigits: 0 })
const percent = (value) => `${(Number(value || 0) * 100).toFixed(1)}%`
const yearOptions = computed(() => [...new Set(store.projects.map((item) => item.year).filter(Boolean))].sort())

function projectAsOf(project) {
  const payments = project.payments.map((payment) => ({
    ...payment,
    amount: !filters.asOfDate || !payment.date || payment.date <= filters.asOfDate ? Number(payment.amount || 0) : 0
  }))
  const accumulatedPaymentAmount = payments.reduce((sum, item) => sum + Number(item.amount || 0), 0)
  const finalAccountAmount = Number(project.finalAccountAmount || 0)
  const bidContractAmount = Number(project.bidContractAmount || project.winningOrContractAmount || 0)
  const unpaidAmount = Math.max((finalAccountAmount || bidContractAmount) - accumulatedPaymentAmount, 0)

  return {
    ...project,
    payments,
    accumulatedPaymentAmount,
    unpaidAmount,
    paymentProgress: finalAccountAmount > 0 ? accumulatedPaymentAmount / finalAccountAmount : 0,
    paymentCompleted: unpaidAmount <= 0 && finalAccountAmount > 0 ? '完成' : project.paymentCompleted
  }
}

const filteredProjects = computed(() =>
  store.projects.map(projectAsOf).filter((item) => {
    return (
      (!filters.year || item.year === filters.year) &&
      (!filters.constructionUnit || item.constructionUnit === filters.constructionUnit) &&
      (!filters.fundSource || item.fundSource === filters.fundSource) &&
      (!filters.projectProgress || item.projectProgress === filters.projectProgress)
    )
  })
)

const filteredWarnings = computed(() =>
  buildWarnings(filteredProjects.value).map((warning) => ({
    ...warning,
    ...(store.warnings.find((item) => item.id === warning.id && item.status === '已处理') || {})
  }))
)
const dashboardTotals = computed(() => store.calculateTotals(filteredProjects.value))

function groupBy(field, valueField = 'finalAccountAmount') {
  const map = new Map()
  filteredProjects.value.forEach((item) => {
    const key = item[field] || '未填写'
    map.set(key, (map.get(key) || 0) + Number(item[valueField] || 0))
  })
  return [...map.entries()].map(([name, value]) => ({ name, value }))
}

const highRiskProjects = computed(() =>
  filteredProjects.value
    .map((project) => ({
      ...project,
      warningCount: filteredWarnings.value.filter((warning) => warning.projectId === project.id && warning.status === '待处理').length
    }))
    .filter((project) => project.warningCount > 0)
    .sort((a, b) => b.warningCount - a.warningCount || b.unpaidAmount - a.unpaidAmount)
)

const unitOption = computed(() => ({
  tooltip: { trigger: 'axis', valueFormatter: (value) => `${money(value)} 元` },
  xAxis: { type: 'category', data: groupBy('constructionUnit').map((item) => item.name), axisLabel: { rotate: 30 } },
  yAxis: { type: 'value' },
  series: [{ type: 'bar', data: groupBy('constructionUnit').map((item) => item.value), itemStyle: { color: '#2563eb' } }]
}))

const categoryOption = computed(() => ({
  tooltip: { trigger: 'item', valueFormatter: (value) => `${money(value)} 元` },
  series: [{ type: 'pie', radius: ['42%', '68%'], data: groupBy('projectCategory') }]
}))

const fundOption = computed(() => ({
  tooltip: { trigger: 'item', valueFormatter: (value) => `${money(value)} 元` },
  series: [{ type: 'pie', radius: ['45%', '70%'], data: groupBy('fundSource') }]
}))

function resetFilters() {
  Object.assign(filters, {
    asOfDate: '2026-05-31',
    year: '',
    constructionUnit: '',
    fundSource: '',
    projectProgress: ''
  })
}
</script>

<template>
  <div class="page-stack">
    <section class="toolbar">
      <div class="panel-header">
        <div class="panel-title">动态看板条件</div>
        <el-button @click="resetFilters">重置</el-button>
      </div>
      <div class="filter-form">
        <el-date-picker v-model="filters.asOfDate" type="date" value-format="YYYY-MM-DD" placeholder="统计日期" />
        <el-select v-model="filters.year" placeholder="年份" clearable>
          <el-option v-for="item in yearOptions" :key="item" :label="item" :value="item" />
        </el-select>
        <el-select v-model="filters.constructionUnit" placeholder="建设主体单位" clearable>
          <el-option v-for="item in store.dictionaries.constructionUnits" :key="item" :label="item" :value="item" />
        </el-select>
        <el-select v-model="filters.fundSource" placeholder="资金来源" clearable>
          <el-option v-for="item in store.dictionaries.fundSources" :key="item" :label="item" :value="item" />
        </el-select>
        <el-select v-model="filters.projectProgress" placeholder="项目进度" clearable>
          <el-option v-for="item in store.dictionaries.projectProgressStatuses" :key="item" :label="item" :value="item" />
        </el-select>
      </div>
      <div class="dashboard-context">
        当前统计日期：{{ filters.asOfDate }} · 命中项目：{{ filteredProjects.length }} 个 · 待处理预警：{{ filteredWarnings.filter((item) => item.status === '待处理').length }} 条
      </div>
    </section>

    <div class="metric-grid">
      <MetricCard label="项目总数" :value="dashboardTotals.projectCount" caption="筛选后的台账数量" tone="blue" />
      <MetricCard label="投资总额/批复价" :value="money(dashboardTotals.investmentAmount)" caption="单位：元" tone="green" />
      <MetricCard label="累计拨付金额" :value="money(dashboardTotals.accumulatedPaymentAmount)" :caption="`总拨款进度 ${percent(dashboardTotals.paymentProgress)}`" tone="blue" />
      <MetricCard label="未拨付金额" :value="money(dashboardTotals.unpaidAmount)" caption="需跟踪尾款" tone="red" />
    </div>

    <div class="metric-grid">
      <MetricCard label="未到位补贴" :value="money(dashboardTotals.subsidyUnreceived)" caption="补贴资金缺口" tone="amber" />
      <MetricCard label="进行中项目" :value="dashboardTotals.inProgressCount" caption="仍需拨付或跟进" tone="green" />
      <MetricCard label="未完成项目" :value="dashboardTotals.unfinishedCount" caption="基础信息或进度未闭环" tone="amber" />
      <MetricCard label="待处理预警" :value="filteredWarnings.filter((item) => item.status === '待处理').length" caption="资金与数据预警" tone="red" />
    </div>

    <div class="chart-grid">
      <ChartBox title="按建设主体单位统计决算金额" :option="unitOption" />
      <ChartBox title="按项目大类统计" :option="categoryOption" />
      <ChartBox title="按资金来源统计" :option="fundOption" />
    </div>

    <section class="panel">
      <div class="panel-header">
        <div class="panel-title">高风险项目</div>
      </div>
      <el-table :data="highRiskProjects" height="320" border>
        <el-table-column prop="serialNo" label="序号" width="80" />
        <el-table-column prop="constructionUnit" label="建设主体单位" width="130" />
        <el-table-column prop="mainProjectName" label="总项目名称" min-width="170" />
        <el-table-column prop="subProjectName" label="子项目名称" min-width="240" />
        <el-table-column prop="unpaidAmount" label="未拨付金额" width="130" sortable>
          <template #default="{ row }">{{ money(row.unpaidAmount) }}</template>
        </el-table-column>
        <el-table-column prop="paymentProgress" label="拨款进度" width="160" sortable>
          <template #default="{ row }"><el-progress :percentage="Math.round(row.paymentProgress * 100)" /></template>
        </el-table-column>
        <el-table-column prop="projectProgress" label="项目进度" width="100">
          <template #default="{ row }"><StatusTag :value="row.projectProgress" /></template>
        </el-table-column>
        <el-table-column prop="warningCount" label="预警数" width="90" />
      </el-table>
    </section>
  </div>
</template>
