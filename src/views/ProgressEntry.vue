<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { Save } from '@lucide/vue'
import StatusTag from '../components/StatusTag.vue'
import { useProjectStore } from '../store/projectStore'

const store = useProjectStore()
const selectedProjectId = ref(store.projects[0]?.id)
const form = reactive({})

const project = computed(() => store.findProject(selectedProjectId.value))
const money = (value) => Number(value || 0).toLocaleString('zh-CN', { maximumFractionDigits: 2 })

watch(
  project,
  (value) => {
    if (value) {
      Object.keys(form).forEach((key) => delete form[key])
      Object.assign(form, JSON.parse(JSON.stringify(value)))
    }
  },
  { immediate: true }
)

const preview = computed(() => {
  const paid = (form.payments || []).reduce((sum, item) => sum + Number(item.amount || 0), 0)
  const finalAmount = Number(form.finalAccountAmount || 0)
  return {
    paid,
    unpaid: Math.max(finalAmount - paid, 0),
    progress: finalAmount ? paid / finalAmount : 0
  }
})

function submit() {
  store.saveProjectProgress(selectedProjectId.value, { ...form })
}
</script>

<template>
  <div class="page-stack">
    <section class="toolbar">
      <div class="filter-form">
        <el-select v-model="selectedProjectId" placeholder="选择项目">
          <el-option v-for="item in store.projects" :key="item.id" :label="`${item.serialNo} ${item.subProjectName}`" :value="item.id" />
        </el-select>
      </div>
    </section>

    <div class="progress-editor">
      <section class="panel">
        <div class="panel-header">
          <div class="panel-title">拨付与项目进度录入</div>
        </div>
        <el-form :model="form" label-width="128px">
          <el-form-item label="子项目名称"><el-input v-model="form.subProjectName" disabled /></el-form-item>
          <el-form-item label="竣工决算价"><el-input-number v-model="form.finalAccountAmount" :min="0" :precision="2" /></el-form-item>
          <el-form-item label="应补贴额"><el-input-number v-model="form.subsidyReceivable" :min="0" :precision="2" /></el-form-item>
          <el-form-item label="实际补贴额"><el-input-number v-model="form.subsidyReceived" :min="0" :precision="2" /></el-form-item>
          <el-form-item label="拨付完成"><el-select v-model="form.paymentCompleted"><el-option v-for="item in store.dictionaries.paymentCompletionStatuses" :key="item" :label="item" :value="item" /></el-select></el-form-item>
          <el-form-item label="项目进度"><el-select v-model="form.projectProgress"><el-option v-for="item in store.dictionaries.projectProgressStatuses" :key="item" :label="item" :value="item" /></el-select></el-form-item>
          <el-form-item label="备注"><el-input v-model="form.remark" type="textarea" :rows="3" /></el-form-item>
          <el-form-item label="操作人"><el-input v-model="form.operator" placeholder="当前用户" /></el-form-item>
          <div class="form-actions">
            <el-button type="primary" :icon="Save" @click="submit">保存进度</el-button>
          </div>
        </el-form>
      </section>

      <section class="panel">
        <div class="panel-header">
          <div class="panel-title">支付明细（1-6 次）</div>
        </div>
        <el-table :data="form.payments" border>
          <el-table-column prop="label" label="支付批次" width="120" />
          <el-table-column label="付款年份" width="140">
            <template #default="{ row }"><el-input-number v-model="row.paymentYear" :min="2010" :max="2100" controls-position="right" /></template>
          </el-table-column>
          <el-table-column label="日期" width="170">
            <template #default="{ row }"><el-date-picker v-model="row.date" value-format="YYYY-MM-DD" type="date" /></template>
          </el-table-column>
          <el-table-column label="金额" min-width="160">
            <template #default="{ row }"><el-input-number v-model="row.amount" :min="0" :precision="2" /></template>
          </el-table-column>
        </el-table>

        <el-descriptions :column="3" border style="margin-top: 16px">
          <el-descriptions-item label="累计拨付金额">{{ money(preview.paid) }}</el-descriptions-item>
          <el-descriptions-item label="未拨付金额">{{ money(preview.unpaid) }}</el-descriptions-item>
          <el-descriptions-item label="拨款进度">
            <el-progress :percentage="Math.round(preview.progress * 100)" />
          </el-descriptions-item>
          <el-descriptions-item label="项目进度"><StatusTag :value="form.projectProgress" /></el-descriptions-item>
          <el-descriptions-item label="拨付完成"><StatusTag :value="form.paymentCompleted" /></el-descriptions-item>
          <el-descriptions-item label="未到位补贴">{{ money(Math.max(Number(form.subsidyReceivable || 0) - Number(form.subsidyReceived || 0), 0)) }}</el-descriptions-item>
        </el-descriptions>
      </section>
    </div>
  </div>
</template>
