<script setup>
import { computed, reactive, ref } from 'vue'
import { CheckCircle } from '@lucide/vue'
import StatusTag from '../components/StatusTag.vue'
import { useProjectStore } from '../store/projectStore'

const store = useProjectStore()
const filters = reactive({ type: '', level: '', status: '' })
const dialogVisible = ref(false)
const selectedWarning = ref()
const form = reactive({ handler: '林若晨', note: '' })

const rows = computed(() =>
  store.warnings.filter(
    (item) =>
      (!filters.type || item.type === filters.type) &&
      (!filters.level || item.level === filters.level) &&
      (!filters.status || item.status === filters.status)
  )
)

const warningTypes = computed(() => [...new Set(store.warnings.map((item) => item.type))])

function openHandle(row) {
  selectedWarning.value = row
  Object.assign(form, { handler: '林若晨', note: row.note || '' })
  dialogVisible.value = true
}

function submit() {
  store.handleWarning(selectedWarning.value.id, { ...form })
  dialogVisible.value = false
}
</script>

<template>
  <div class="page-stack">
    <section class="toolbar">
      <div class="filter-form">
        <el-select v-model="filters.type" placeholder="预警类型" clearable>
          <el-option v-for="item in warningTypes" :key="item" :label="item" :value="item" />
        </el-select>
        <el-select v-model="filters.level" placeholder="预警等级" clearable>
          <el-option label="高" value="高" />
          <el-option label="中" value="中" />
          <el-option label="低" value="低" />
        </el-select>
        <el-select v-model="filters.status" placeholder="处理状态" clearable>
          <el-option label="待处理" value="待处理" />
          <el-option label="已处理" value="已处理" />
        </el-select>
      </div>
    </section>

    <section class="panel">
      <el-table :data="rows" border>
        <el-table-column prop="type" label="类型" width="150" />
        <el-table-column prop="level" label="等级" width="90"><template #default="{ row }"><StatusTag :value="row.level" /></template></el-table-column>
        <el-table-column prop="constructionUnit" label="建设主体单位" width="130" />
        <el-table-column prop="year" label="年份" width="90" />
        <el-table-column prop="projectName" label="子项目名称" min-width="240" />
        <el-table-column prop="reason" label="触发原因" min-width="300" />
        <el-table-column prop="createdAt" label="触发时间" width="115" />
        <el-table-column prop="status" label="处理状态" width="100"><template #default="{ row }"><StatusTag :value="row.status" /></template></el-table-column>
        <el-table-column prop="handler" label="处理人" width="100" />
        <el-table-column prop="note" label="处理备注" min-width="160" />
        <el-table-column label="操作" width="110" fixed="right">
          <template #default="{ row }">
            <el-button v-if="row.status === '待处理'" size="small" type="primary" :icon="CheckCircle" @click="openHandle(row)">处理</el-button>
            <span v-else class="success-text">已完成</span>
          </template>
        </el-table-column>
      </el-table>
    </section>

    <el-dialog v-model="dialogVisible" title="处理预警" width="520px">
      <el-form :model="form" label-width="90px">
        <el-form-item label="处理人"><el-input v-model="form.handler" /></el-form-item>
        <el-form-item label="处理备注"><el-input v-model="form.note" type="textarea" :rows="4" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submit">确认处理</el-button>
      </template>
    </el-dialog>
  </div>
</template>
