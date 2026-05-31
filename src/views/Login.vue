<script setup>
import { reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { LockKeyhole, LogIn, UserRound } from '@lucide/vue'
import { roleOptions } from '../data/mock'
import { useProjectStore } from '../store/projectStore'

const route = useRoute()
const router = useRouter()
const store = useProjectStore()
const form = reactive({
  account: 'admin',
  password: '123456',
  role: '管理员'
})

function submit() {
  store.login({ account: form.account, role: form.role })
  router.replace(route.query.redirect || '/dashboard')
}
</script>

<template>
  <main class="login-page">
    <section class="login-visual">
      <div class="login-brand">￥</div>
      <h1>工程建设项目资金监管平台</h1>
      <p>围绕项目台账、拨付进度、补贴到位、合同决算和风险预警进行统一管理。</p>
      <div class="login-stats">
        <span>项目支出明细</span>
        <strong>Finance Control</strong>
      </div>
    </section>

    <section class="login-panel">
      <h2>系统登录</h2>
      <p>请选择角色进入对应工作台</p>
      <el-form :model="form" label-position="top" @keyup.enter="submit">
        <el-form-item label="账号">
          <el-input v-model="form.account" size="large" placeholder="admin">
            <template #prefix><UserRound :size="18" /></template>
          </el-input>
        </el-form-item>
        <el-form-item label="密码">
          <el-input v-model="form.password" size="large" type="password" show-password placeholder="123456">
            <template #prefix><LockKeyhole :size="18" /></template>
          </el-input>
        </el-form-item>
        <el-form-item label="登录角色">
          <el-select v-model="form.role" size="large">
            <el-option v-for="item in roleOptions" :key="item" :label="item" :value="item" />
          </el-select>
        </el-form-item>
        <el-button type="primary" size="large" :icon="LogIn" class="login-submit" @click="submit">登录系统</el-button>
      </el-form>
    </section>
  </main>
</template>
