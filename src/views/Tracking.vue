<script setup>
import { computed, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { Eye } from '@lucide/vue'
import StatusTag from '../components/StatusTag.vue'
import { useProjectStore } from '../store/projectStore'

const store = useProjectStore()
const router = useRouter()
const filters = reactive({ keyword: '', year: '', constructionUnit: '', projectCategory: '', paymentCompleted: '' })
const money = (value) => Number(value || 0).toLocaleString('zh-CN', { maximumFractionDigits: 2 })

const yearOptions = computed(() => [...new Set(store.projects.map((item) => item.year).filter(Boolean))].sort())
const rows = computed(() =>
  store.projects.filter((item) => {
    const text = `${item.mainProjectName}${item.subProjectName}${item.supplierInfo}${item.serviceContent}`
    return (
      (!filters.keyword || text.includes(filters.keyword)) &&
      (!filters.year || item.year === filters.year) &&
      (!filters.constructionUnit || item.constructionUnit === filters.constructionUnit) &&
      (!filters.projectCategory || item.projectCategory === filters.projectCategory) &&
      (!filters.paymentCompleted || item.paymentCompleted === filters.paymentCompleted)
    )
  })
)
</script>

<template>
  <div class="page-stack">
    <section class="toolbar">
      <div class="filter-form">
        <el-input v-model="filters.keyword" placeholder="项目/供应商/服务内容" clearable />
        <el-select v-model="filters.year" placeholder="年份" clearable><el-option v-for="item in yearOptions" :key="item" :label="item" :value="item" /></el-select>
        <el-select v-model="filters.constructionUnit" placeholder="建设主体单位" clearable><el-option v-for="item in store.dictionaries.constructionUnits" :key="item" :label="item" :value="item" /></el-select>
        <el-select v-model="filters.projectCategory" placeholder="项目大类" clearable><el-option v-for="item in store.dictionaries.projectCategories" :key="item" :label="item" :value="item" /></el-select>
        <el-select v-model="filters.paymentCompleted" placeholder="拨付完成" clearable><el-option v-for="item in store.dictionaries.paymentCompletionStatuses" :key="item" :label="item" :value="item" /></el-select>
      </div>
    </section>

    <section class="panel">
      <el-table :data="rows" border>
        <el-table-column prop="serialNo" label="序号" width="80" fixed="left" />
        <el-table-column prop="constructionUnit" label="建设主体单位" width="130" />
        <el-table-column prop="mainProjectName" label="总项目名称" min-width="170" />
        <el-table-column prop="subProjectName" label="子项目名称" min-width="240" />
        <el-table-column prop="supplierInfo" label="供应商信息" min-width="210" />
        <el-table-column prop="serviceContent" label="服务内容" width="110" />
        <el-table-column prop="fundSource" label="资金来源" width="95"><template #default="{ row }"><StatusTag :value="row.fundSource" /></template></el-table-column>
        <el-table-column prop="accumulatedPaymentAmount" label="累计拨付金额" width="140" sortable><template #default="{ row }">{{ money(row.accumulatedPaymentAmount) }}</template></el-table-column>
        <el-table-column prop="unpaidAmount" label="未拨付金额" width="130" sortable><template #default="{ row }">{{ money(row.unpaidAmount) }}</template></el-table-column>
        <el-table-column prop="paymentProgress" label="拨款进度" width="150" sortable><template #default="{ row }"><el-progress :percentage="Math.round(row.paymentProgress * 100)" /></template></el-table-column>
        <el-table-column prop="paymentCompleted" label="拨付完成" width="100"><template #default="{ row }"><StatusTag :value="row.paymentCompleted" /></template></el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }"><el-button size="small" :icon="Eye" @click="router.push(`/projects/${row.id}`)">详情</el-button></template>
        </el-table-column>
      </el-table>
    </section>
  </div>
</template>
