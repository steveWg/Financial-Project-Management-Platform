<script setup>
import { computed, reactive } from 'vue'
import ChartBox from '../components/ChartBox.vue'
import StatusTag from '../components/StatusTag.vue'
import { useProjectStore } from '../store/projectStore'

const store = useProjectStore()
const filters = reactive({
  year: '',
  constructionUnit: '',
  mainProjectName: '',
  subProjectName: '',
  projectCategory: '',
  supplierInfo: '',
  serviceContent: '',
  fundSource: '',
  projectProgress: '',
  paymentCompleted: '',
  minUnpaid: null,
  maxUnpaid: null
})
const money = (value) => Number(value || 0).toLocaleString('zh-CN', { maximumFractionDigits: 2 })

const yearOptions = computed(() => [...new Set(store.projects.map((item) => item.year).filter(Boolean))].sort())
const rows = computed(() =>
  store.projects.filter((item) => {
    return (
      (!filters.year || item.year === filters.year) &&
      (!filters.constructionUnit || item.constructionUnit === filters.constructionUnit) &&
      (!filters.mainProjectName || item.mainProjectName.includes(filters.mainProjectName)) &&
      (!filters.subProjectName || item.subProjectName.includes(filters.subProjectName)) &&
      (!filters.projectCategory || item.projectCategory === filters.projectCategory) &&
      (!filters.supplierInfo || item.supplierInfo === filters.supplierInfo) &&
      (!filters.serviceContent || item.serviceContent === filters.serviceContent) &&
      (!filters.fundSource || item.fundSource === filters.fundSource) &&
      (!filters.projectProgress || item.projectProgress === filters.projectProgress) &&
      (!filters.paymentCompleted || item.paymentCompleted === filters.paymentCompleted) &&
      (filters.minUnpaid === null || item.unpaidAmount >= filters.minUnpaid) &&
      (filters.maxUnpaid === null || item.unpaidAmount <= filters.maxUnpaid)
    )
  })
)

function group(field) {
  const map = new Map()
  rows.value.forEach((item) => map.set(item[field] || '未填写', (map.get(item[field] || '未填写') || 0) + Number(item.finalAccountAmount || 0)))
  return [...map.entries()].map(([name, value]) => ({ name, value }))
}

const unitOption = computed(() => ({
  tooltip: { trigger: 'axis' },
  xAxis: { type: 'category', data: group('constructionUnit').map((item) => item.name), axisLabel: { rotate: 30 } },
  yAxis: { type: 'value' },
  series: [{ type: 'bar', data: group('constructionUnit').map((item) => item.value), itemStyle: { color: '#24a19c' } }]
}))

const yearOption = computed(() => ({
  tooltip: { trigger: 'axis' },
  xAxis: { type: 'category', data: group('year').map((item) => String(item.name)) },
  yAxis: { type: 'value' },
  series: [{ type: 'line', smooth: true, data: group('year').map((item) => item.value), itemStyle: { color: '#2563eb' } }]
}))
</script>

<template>
  <div class="page-stack">
    <section class="toolbar">
      <div class="filter-form">
        <el-select v-model="filters.year" placeholder="年份" clearable><el-option v-for="item in yearOptions" :key="item" :label="item" :value="item" /></el-select>
        <el-select v-model="filters.constructionUnit" placeholder="建设主体单位" clearable><el-option v-for="item in store.dictionaries.constructionUnits" :key="item" :label="item" :value="item" /></el-select>
        <el-input v-model="filters.mainProjectName" placeholder="总项目名称" clearable />
        <el-input v-model="filters.subProjectName" placeholder="子项目名称" clearable />
        <el-select v-model="filters.projectCategory" placeholder="项目大类" clearable><el-option v-for="item in store.dictionaries.projectCategories" :key="item" :label="item" :value="item" /></el-select>
        <el-select v-model="filters.supplierInfo" placeholder="供应商信息" clearable><el-option v-for="item in store.dictionaries.suppliers" :key="item" :label="item" :value="item" /></el-select>
        <el-select v-model="filters.serviceContent" placeholder="服务内容" clearable><el-option v-for="item in store.dictionaries.serviceContents" :key="item" :label="item" :value="item" /></el-select>
        <el-select v-model="filters.fundSource" placeholder="资金来源" clearable><el-option v-for="item in store.dictionaries.fundSources" :key="item" :label="item" :value="item" /></el-select>
        <el-select v-model="filters.projectProgress" placeholder="项目进度" clearable><el-option v-for="item in store.dictionaries.projectProgressStatuses" :key="item" :label="item" :value="item" /></el-select>
        <el-select v-model="filters.paymentCompleted" placeholder="拨付完成" clearable><el-option v-for="item in store.dictionaries.paymentCompletionStatuses" :key="item" :label="item" :value="item" /></el-select>
        <el-input-number v-model="filters.minUnpaid" placeholder="未拨付下限" :min="0" />
        <el-input-number v-model="filters.maxUnpaid" placeholder="未拨付上限" :min="0" />
      </div>
    </section>

    <div class="chart-grid">
      <ChartBox title="按建设主体单位统计" :option="unitOption" />
      <ChartBox title="按年份统计" :option="yearOption" />
      <section class="panel">
        <div class="panel-title">查询汇总</div>
        <el-descriptions :column="1" border style="margin-top: 16px">
          <el-descriptions-item label="项目数">{{ rows.length }}</el-descriptions-item>
          <el-descriptions-item label="投资总额">{{ money(rows.reduce((sum, item) => sum + Number(item.investmentAmount || 0), 0)) }}</el-descriptions-item>
          <el-descriptions-item label="竣工决算价">{{ money(rows.reduce((sum, item) => sum + Number(item.finalAccountAmount || 0), 0)) }}</el-descriptions-item>
          <el-descriptions-item label="累计拨付">{{ money(rows.reduce((sum, item) => sum + Number(item.accumulatedPaymentAmount || 0), 0)) }}</el-descriptions-item>
          <el-descriptions-item label="未拨付">{{ money(rows.reduce((sum, item) => sum + Number(item.unpaidAmount || 0), 0)) }}</el-descriptions-item>
        </el-descriptions>
      </section>
    </div>

    <section class="panel">
      <el-table :data="rows" border>
        <el-table-column prop="year" label="年份" width="90" sortable />
        <el-table-column prop="constructionUnit" label="建设主体单位" width="130" />
        <el-table-column prop="mainProjectName" label="总项目名称" min-width="170" />
        <el-table-column prop="subProjectName" label="子项目名称" min-width="230" />
        <el-table-column prop="fundSource" label="资金来源" width="95"><template #default="{ row }"><StatusTag :value="row.fundSource" /></template></el-table-column>
        <el-table-column prop="investmentAmount" label="投资总额/批复价" width="150" sortable><template #default="{ row }">{{ money(row.investmentAmount) }}</template></el-table-column>
        <el-table-column prop="bidContractAmount" label="中标/合同价" width="130" sortable><template #default="{ row }">{{ money(row.bidContractAmount) }}</template></el-table-column>
        <el-table-column prop="finalAccountAmount" label="竣工决算价" width="130" sortable><template #default="{ row }">{{ money(row.finalAccountAmount) }}</template></el-table-column>
        <el-table-column prop="unpaidAmount" label="未拨付金额" width="130" sortable><template #default="{ row }">{{ money(row.unpaidAmount) }}</template></el-table-column>
        <el-table-column prop="projectProgress" label="项目进度" width="100"><template #default="{ row }"><StatusTag :value="row.projectProgress" /></template></el-table-column>
      </el-table>
    </section>
  </div>
</template>
