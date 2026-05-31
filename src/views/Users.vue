<script setup>
import { reactive, ref } from 'vue'
import { Edit, Plus } from '@lucide/vue'
import StatusTag from '../components/StatusTag.vue'
import { roleOptions } from '../data/mock'
import { useProjectStore } from '../store/projectStore'

const store = useProjectStore()
const dialogVisible = ref(false)
const formRef = ref()
const form = reactive({})

const rules = {
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  account: [{ required: true, message: '请输入账号', trigger: 'blur' }],
  role: [{ required: true, message: '请选择角色', trigger: 'change' }]
}

function openDialog(row) {
  Object.assign(form, row || { name: '', account: '', phone: '', email: '', department: '财政所', role: '查看人员', status: '启用' })
  dialogVisible.value = true
}

async function submit() {
  await formRef.value.validate()
  store.saveUser({ ...form })
  dialogVisible.value = false
}
</script>

<template>
  <div class="page-stack">
    <section class="panel">
      <div class="panel-header">
        <div class="panel-title">用户管理</div>
        <el-button type="primary" :icon="Plus" @click="openDialog()">新增用户</el-button>
      </div>
      <el-table :data="store.users" border>
        <el-table-column prop="name" label="姓名" width="110" />
        <el-table-column prop="account" label="账号" width="120" />
        <el-table-column prop="phone" label="手机号" width="140" />
        <el-table-column prop="email" label="邮箱" min-width="180" />
        <el-table-column prop="department" label="部门/单位" width="140" />
        <el-table-column prop="role" label="角色" width="130" />
        <el-table-column prop="status" label="状态" width="90">
          <template #default="{ row }"><StatusTag :value="row.status" /></template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="120" />
        <el-table-column label="操作" width="170" fixed="right">
          <template #default="{ row }">
            <el-button size="small" :icon="Edit" @click="openDialog(row)">编辑</el-button>
            <el-button size="small" @click="store.toggleUserStatus(row)">{{ row.status === '启用' ? '停用' : '启用' }}</el-button>
          </template>
        </el-table-column>
      </el-table>
    </section>

    <el-dialog v-model="dialogVisible" title="用户信息" width="560px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="姓名" prop="name"><el-input v-model="form.name" /></el-form-item>
        <el-form-item label="账号" prop="account"><el-input v-model="form.account" /></el-form-item>
        <el-form-item label="手机号"><el-input v-model="form.phone" /></el-form-item>
        <el-form-item label="邮箱"><el-input v-model="form.email" /></el-form-item>
        <el-form-item label="部门/单位">
          <el-select v-model="form.department">
            <el-option v-for="item in store.dictionaries.departments" :key="item" :label="item" :value="item" />
          </el-select>
        </el-form-item>
        <el-form-item label="角色" prop="role">
          <el-select v-model="form.role">
            <el-option v-for="item in roleOptions" :key="item" :label="item" :value="item" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="form.status">
            <el-radio-button label="启用" />
            <el-radio-button label="停用" />
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>
