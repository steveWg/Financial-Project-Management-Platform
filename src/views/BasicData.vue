<script setup>
import { reactive } from 'vue'
import { Plus } from '@lucide/vue'
import { useProjectStore } from '../store/projectStore'

const store = useProjectStore()
const labels = {
  departments: '部门/单位',
  suppliers: '供应商信息',
  serviceContents: '服务内容',
  subsidyForms: '补贴形式',
  constructionUnits: '建设主体单位',
  projectCategories: '项目大类',
  dataQueries: '数据查询',
  fundSources: '资金来源',
  accountingStatuses: '账务处理状态',
  projectProgressStatuses: '项目进度状态',
  paymentCompletionStatuses: '拨付完成状态'
}
const inputs = reactive({})

function add(type) {
  store.addDictionaryItem(type, inputs[type])
  inputs[type] = ''
}
</script>

<template>
  <div class="dictionary-grid">
    <section v-for="(items, type) in store.dictionaries" :key="type" class="panel">
      <div class="panel-header">
        <div class="panel-title">{{ labels[type] }}</div>
      </div>
      <div class="dict-tags">
        <el-tag v-for="item in items" :key="item" closable @close="store.removeDictionaryItem(type, item)">{{ item }}</el-tag>
      </div>
      <el-input v-model="inputs[type]" placeholder="新增选项" @keyup.enter="add(type)">
        <template #append>
          <el-button :icon="Plus" @click="add(type)" />
        </template>
      </el-input>
    </section>
  </div>
</template>
