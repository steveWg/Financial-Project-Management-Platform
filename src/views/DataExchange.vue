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
    ElMessage.error(error.message || 'Excel 校验失败')
  } finally {
    importing.value = false
  }
}

async function applyImport() {
  if (!selectedFile.value || !preview.value) return
  if (preview.value.errors?.length) {
    ElMessage.error('请先修正 Excel 错误后再导入')
    return
  }
  await ElMessageBox.confirm('确认将预览中的项目台账写入数据库？', '确认导入', { type: 'warning' })
  importing.value = true
  try {
    preview.value = await store.applyProjectImport(selectedFile.value)
    ElMessage.success('导入完成')
  } catch (error) {
    ElMessage.error(error.message || '导入失败')
  } finally {
    importing.value = false
  }
}
</script>

<template>
  <section class="page-stack">
    <div class="panel panel-header data-exchange-header">
      <div>
        <div class="panel-title">数据导入导出</div>
        <p class="page-subtitle">导出项目台账 Excel，或上传 Excel 校验后写入本地数据库。</p>
      </div>
      <el-button type="primary" :icon="Download" @click="downloadProjects">导出项目台账</el-button>
    </div>

    <el-alert v-if="store.backendError" :title="store.backendError" type="error" show-icon />

    <div class="panel data-exchange-actions">
      <el-upload accept=".xlsx" :auto-upload="false" :show-file-list="true" :limit="1" @change="handleFileChange">
        <el-button :icon="Upload">选择 Excel 文件</el-button>
      </el-upload>
      <el-button type="success" :disabled="!preview || preview.errors?.length || importing" :loading="importing" @click="applyImport">确认导入</el-button>
    </div>

    <el-descriptions v-if="preview" :column="4" border class="panel">
      <el-descriptions-item label="新增">{{ preview.createdCount }}</el-descriptions-item>
      <el-descriptions-item label="更新">{{ preview.updatedCount }}</el-descriptions-item>
      <el-descriptions-item label="跳过">{{ preview.skippedCount }}</el-descriptions-item>
      <el-descriptions-item label="错误">{{ preview.errors?.length || 0 }}</el-descriptions-item>
    </el-descriptions>

    <div v-if="preview?.errors?.length" class="panel">
      <div class="panel-title">校验错误</div>
      <el-table :data="preview.errors" border>
        <el-table-column prop="row" label="行号" width="100" />
        <el-table-column prop="message" label="错误原因" />
      </el-table>
    </div>
  </section>
</template>
