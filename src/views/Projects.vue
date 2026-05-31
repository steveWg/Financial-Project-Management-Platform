<script setup>
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Edit, Eye, Plus } from '@lucide/vue'
import StatusTag from '../components/StatusTag.vue'
import { paymentLabels } from '../data/mock'
import { useProjectStore } from '../store/projectStore'

const store = useProjectStore()
const router = useRouter()
const dialogVisible = ref(false)
const formRef = ref()
const filters = reactive({ keyword: '', year: '', constructionUnit: '', fundSource: '', projectProgress: '' })
const form = reactive({})

const money = (value) => Number(value || 0).toLocaleString('zh-CN', { maximumFractionDigits: 2 })

const yearOptions = computed(() => [...new Set(store.projects.map((item) => item.year).filter(Boolean))].sort())
const filteredProjects = computed(() =>
  store.projects.filter((item) => {
    const text = `${item.mainProjectName}${item.subProjectName}${item.subProjectNo}${item.supplierInfo}`
    return (
      (!filters.keyword || text.includes(filters.keyword)) &&
      (!filters.year || item.year === filters.year) &&
      (!filters.constructionUnit || item.constructionUnit === filters.constructionUnit) &&
      (!filters.fundSource || item.fundSource === filters.fundSource) &&
      (!filters.projectProgress || item.projectProgress === filters.projectProgress)
    )
  })
)

const rules = {
  constructionUnit: [{ required: true, message: '请选择建设主体单位', trigger: 'change' }],
  mainProjectName: [{ required: true, message: '请输入总项目名称', trigger: 'blur' }],
  subProjectName: [{ required: true, message: '请输入子项目名称', trigger: 'blur' }],
  year: [{ required: true, message: '请输入年份', trigger: 'blur' }],
  fundSource: [{ required: true, message: '请选择资金来源', trigger: 'change' }]
}

function emptyProject() {
  return {
    constructionUnit: '',
    mainProjectName: '',
    subProjectNo: '',
    subProjectName: '',
    year: new Date().getFullYear(),
    projectCategory: '',
    investmentAmount: 0,
    fundSource: '',
    subsidyForm: '',
    subsidyReceivable: 0,
    subsidyReceived: 0,
    subsidyUnreceived: 0,
    accountingTreatment: '未处理',
    transferredExpenseAmount: 0,
    bidContractAmount: 0,
    winningOrContractAmount: 0,
    contractChangeAmount: 0,
    adjustmentRate: 0,
    finalAccountAmount: 0,
    paymentCompleted: '未完成',
    superiorSubsidySource: 0,
    townFundSource: 0,
    townBudget2024: 0,
    projectProgress: '未完成',
    supplierInfo: '',
    serviceContent: '',
    remark: '',
    payments: paymentLabels.map((label) => ({ label, paymentYear: '', date: '', amount: 0 }))
  }
}

function openDialog(row) {
  Object.keys(form).forEach((key) => delete form[key])
  Object.assign(form, JSON.parse(JSON.stringify(row || emptyProject())))
  dialogVisible.value = true
}

async function submit() {
  await formRef.value.validate()
  store.saveProject({ ...form })
  dialogVisible.value = false
}
</script>

<template>
  <div class="page-stack">
    <section class="toolbar">
      <div class="filter-form">
        <el-input v-model="filters.keyword" placeholder="项目/供应商/编号" clearable />
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
        <el-button type="primary" :icon="Plus" @click="openDialog()">新增台账</el-button>
      </div>
    </section>

    <section class="panel">
      <el-table :data="filteredProjects" border>
        <el-table-column prop="serialNo" label="序号" width="80" fixed="left" />
        <el-table-column prop="constructionUnit" label="建设主体单位" width="130" />
        <el-table-column prop="mainProjectName" label="总项目名称" min-width="170" />
        <el-table-column prop="subProjectName" label="子项目名称" min-width="240" />
        <el-table-column prop="year" label="年份" width="90" sortable />
        <el-table-column prop="fundSource" label="资金来源" width="95"><template #default="{ row }"><StatusTag :value="row.fundSource" /></template></el-table-column>
        <el-table-column prop="investmentAmount" label="投资总额/批复价" width="150" sortable><template #default="{ row }">{{ money(row.investmentAmount) }}</template></el-table-column>
        <el-table-column prop="bidContractAmount" label="中标/合同价" width="130" sortable><template #default="{ row }">{{ money(row.bidContractAmount) }}</template></el-table-column>
        <el-table-column prop="finalAccountAmount" label="竣工决算价" width="130" sortable><template #default="{ row }">{{ money(row.finalAccountAmount) }}</template></el-table-column>
        <el-table-column prop="accumulatedPaymentAmount" label="累计拨付金额" width="140" sortable><template #default="{ row }">{{ money(row.accumulatedPaymentAmount) }}</template></el-table-column>
        <el-table-column prop="unpaidAmount" label="未拨付金额" width="130" sortable><template #default="{ row }">{{ money(row.unpaidAmount) }}</template></el-table-column>
        <el-table-column prop="paymentProgress" label="拨款进度" width="150" sortable><template #default="{ row }"><el-progress :percentage="Math.round(row.paymentProgress * 100)" /></template></el-table-column>
        <el-table-column prop="projectProgress" label="项目进度" width="100"><template #default="{ row }"><StatusTag :value="row.projectProgress" /></template></el-table-column>
        <el-table-column label="操作" width="210" fixed="right">
          <template #default="{ row }">
            <el-button size="small" :icon="Eye" @click="router.push(`/projects/${row.id}`)">详情</el-button>
            <el-button size="small" :icon="Edit" @click="openDialog(row)">编辑</el-button>
          </template>
        </el-table-column>
      </el-table>
    </section>

    <el-dialog v-model="dialogVisible" title="项目资金台账" width="960px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="132px">
        <el-tabs>
          <el-tab-pane label="基本信息">
            <el-row :gutter="16">
              <el-col :span="12"><el-form-item label="建设主体单位" prop="constructionUnit"><el-select v-model="form.constructionUnit"><el-option v-for="item in store.dictionaries.constructionUnits" :key="item" :label="item" :value="item" /></el-select></el-form-item></el-col>
              <el-col :span="12"><el-form-item label="年份" prop="year"><el-input-number v-model="form.year" :min="2010" :max="2100" /></el-form-item></el-col>
              <el-col :span="12"><el-form-item label="总项目名称" prop="mainProjectName"><el-input v-model="form.mainProjectName" /></el-form-item></el-col>
              <el-col :span="12"><el-form-item label="子项目号"><el-input v-model="form.subProjectNo" /></el-form-item></el-col>
              <el-col :span="24"><el-form-item label="子项目名称" prop="subProjectName"><el-input v-model="form.subProjectName" /></el-form-item></el-col>
              <el-col :span="12"><el-form-item label="项目大类"><el-select v-model="form.projectCategory"><el-option v-for="item in store.dictionaries.projectCategories" :key="item" :label="item" :value="item" /></el-select></el-form-item></el-col>
              <el-col :span="12"><el-form-item label="项目进度"><el-select v-model="form.projectProgress"><el-option v-for="item in store.dictionaries.projectProgressStatuses" :key="item" :label="item" :value="item" /></el-select></el-form-item></el-col>
              <el-col :span="24"><el-form-item label="备注"><el-input v-model="form.remark" type="textarea" :rows="3" /></el-form-item></el-col>
            </el-row>
          </el-tab-pane>
          <el-tab-pane label="资金补贴">
            <el-row :gutter="16">
              <el-col :span="12"><el-form-item label="投资总额/批复价"><el-input-number v-model="form.investmentAmount" :min="0" :precision="2" /></el-form-item></el-col>
              <el-col :span="12"><el-form-item label="资金来源" prop="fundSource"><el-select v-model="form.fundSource"><el-option v-for="item in store.dictionaries.fundSources" :key="item" :label="item" :value="item" /></el-select></el-form-item></el-col>
              <el-col :span="24"><el-form-item label="补贴形式"><el-select v-model="form.subsidyForm"><el-option v-for="item in store.dictionaries.subsidyForms" :key="item" :label="item" :value="item" /></el-select></el-form-item></el-col>
              <el-col :span="8"><el-form-item label="应补贴额"><el-input-number v-model="form.subsidyReceivable" :min="0" :precision="2" /></el-form-item></el-col>
              <el-col :span="8"><el-form-item label="实际补贴额"><el-input-number v-model="form.subsidyReceived" :min="0" :precision="2" /></el-form-item></el-col>
              <el-col :span="8"><el-form-item label="未到位补贴"><el-input-number v-model="form.subsidyUnreceived" :min="0" :precision="2" /></el-form-item></el-col>
              <el-col :span="12"><el-form-item label="账务处理"><el-select v-model="form.accountingTreatment"><el-option v-for="item in store.dictionaries.accountingStatuses" :key="item" :label="item" :value="item" /></el-select></el-form-item></el-col>
              <el-col :span="12"><el-form-item label="转列支金额"><el-input-number v-model="form.transferredExpenseAmount" :min="0" :precision="2" /></el-form-item></el-col>
            </el-row>
          </el-tab-pane>
          <el-tab-pane label="合同决算">
            <el-row :gutter="16">
              <el-col :span="12"><el-form-item label="供应商信息"><el-select v-model="form.supplierInfo"><el-option v-for="item in store.dictionaries.suppliers" :key="item" :label="item" :value="item" /></el-select></el-form-item></el-col>
              <el-col :span="12"><el-form-item label="服务内容"><el-select v-model="form.serviceContent"><el-option v-for="item in store.dictionaries.serviceContents" :key="item" :label="item" :value="item" /></el-select></el-form-item></el-col>
              <el-col :span="8"><el-form-item label="中标价或合同价"><el-input-number v-model="form.winningOrContractAmount" :min="0" :precision="2" /></el-form-item></el-col>
              <el-col :span="8"><el-form-item label="中标/合同价"><el-input-number v-model="form.bidContractAmount" :min="0" :precision="2" /></el-form-item></el-col>
              <el-col :span="8"><el-form-item label="合同变更价"><el-input-number v-model="form.contractChangeAmount" :precision="2" /></el-form-item></el-col>
              <el-col :span="12"><el-form-item label="调减/调增%"><el-input-number v-model="form.adjustmentRate" :precision="4" :step="0.01" /></el-form-item></el-col>
              <el-col :span="12"><el-form-item label="竣工决算价"><el-input-number v-model="form.finalAccountAmount" :min="0" :precision="2" /></el-form-item></el-col>
            </el-row>
          </el-tab-pane>
          <el-tab-pane label="资金来源拆分">
            <el-row :gutter="16">
              <el-col :span="12"><el-form-item label="上级补贴"><el-input-number v-model="form.superiorSubsidySource" :min="0" :precision="2" /></el-form-item></el-col>
              <el-col :span="12"><el-form-item label="镇级资金"><el-input-number v-model="form.townFundSource" :min="0" :precision="2" /></el-form-item></el-col>
              <el-col :span="12"><el-form-item label="24年镇级预算"><el-input-number v-model="form.townBudget2024" :min="0" :precision="2" /></el-form-item></el-col>
              <el-col :span="12"><el-form-item label="拨付完成"><el-select v-model="form.paymentCompleted"><el-option v-for="item in store.dictionaries.paymentCompletionStatuses" :key="item" :label="item" :value="item" /></el-select></el-form-item></el-col>
            </el-row>
          </el-tab-pane>
        </el-tabs>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>
