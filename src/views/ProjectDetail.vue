<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import StatusTag from '../components/StatusTag.vue'
import { useProjectStore } from '../store/projectStore'

const route = useRoute()
const router = useRouter()
const store = useProjectStore()
const project = computed(() => store.findProject(route.params.id))
const warnings = computed(() => store.warnings.filter((item) => item.projectId === route.params.id))
const money = (value) => Number(value || 0).toLocaleString('zh-CN', { maximumFractionDigits: 2 })
const percent = (value) => `${(Number(value || 0) * 100).toFixed(2)}%`
</script>

<template>
  <div v-if="project" class="page-stack">
    <section class="panel detail-hero">
      <div>
        <h2 class="detail-title">{{ project.subProjectName }}</h2>
        <div class="muted">{{ project.mainProjectName }} · {{ project.constructionUnit || '未填写主体单位' }} · {{ project.year || '未填写年份' }}</div>
        <el-descriptions :column="4" size="small" border style="margin-top: 16px">
          <el-descriptions-item label="序号">{{ project.serialNo }}</el-descriptions-item>
          <el-descriptions-item label="子项目号">{{ project.subProjectNo || '-' }}</el-descriptions-item>
          <el-descriptions-item label="项目大类">{{ project.projectCategory || '-' }}</el-descriptions-item>
          <el-descriptions-item label="项目进度"><StatusTag :value="project.projectProgress" /></el-descriptions-item>
          <el-descriptions-item label="资金来源"><StatusTag :value="project.fundSource" /></el-descriptions-item>
          <el-descriptions-item label="拨付完成"><StatusTag :value="project.paymentCompleted" /></el-descriptions-item>
          <el-descriptions-item label="供应商">{{ project.supplierInfo || '-' }}</el-descriptions-item>
          <el-descriptions-item label="服务内容">{{ project.serviceContent || '-' }}</el-descriptions-item>
        </el-descriptions>
      </div>
      <el-progress type="dashboard" :percentage="Math.round(project.paymentProgress * 100)" :width="180" />
    </section>

    <section class="panel">
      <el-tabs>
        <el-tab-pane label="基本信息">
          <el-descriptions :column="2" border>
            <el-descriptions-item label="建设主体单位">{{ project.constructionUnit || '-' }}</el-descriptions-item>
            <el-descriptions-item label="总项目名称">{{ project.mainProjectName }}</el-descriptions-item>
            <el-descriptions-item label="子项目号">{{ project.subProjectNo || '-' }}</el-descriptions-item>
            <el-descriptions-item label="子项目名称">{{ project.subProjectName }}</el-descriptions-item>
            <el-descriptions-item label="年份">{{ project.year || '-' }}</el-descriptions-item>
            <el-descriptions-item label="项目大类">{{ project.projectCategory || '-' }}</el-descriptions-item>
            <el-descriptions-item label="备注" :span="2">{{ project.remark || '-' }}</el-descriptions-item>
          </el-descriptions>
        </el-tab-pane>

        <el-tab-pane label="资金补贴">
          <el-descriptions :column="3" border>
            <el-descriptions-item label="投资总额/批复价">{{ money(project.investmentAmount) }}</el-descriptions-item>
            <el-descriptions-item label="资金来源">{{ project.fundSource || '-' }}</el-descriptions-item>
            <el-descriptions-item label="补贴形式">{{ project.subsidyForm || '-' }}</el-descriptions-item>
            <el-descriptions-item label="应补贴额">{{ money(project.subsidyReceivable) }}</el-descriptions-item>
            <el-descriptions-item label="实际补贴额">{{ money(project.subsidyReceived) }}</el-descriptions-item>
            <el-descriptions-item label="未到位补贴">{{ money(project.subsidyUnreceived) }}</el-descriptions-item>
            <el-descriptions-item label="账务处理">{{ project.accountingTreatment || '-' }}</el-descriptions-item>
            <el-descriptions-item label="转列支金额">{{ money(project.transferredExpenseAmount) }}</el-descriptions-item>
            <el-descriptions-item label="差额">{{ money(project.differenceAmount) }}</el-descriptions-item>
            <el-descriptions-item label="资金来源（上级补贴）">{{ money(project.superiorSubsidySource) }}</el-descriptions-item>
            <el-descriptions-item label="资金来源（镇级）">{{ money(project.townFundSource) }}</el-descriptions-item>
            <el-descriptions-item label="24年镇级预算">{{ money(project.townBudget2024) }}</el-descriptions-item>
          </el-descriptions>
        </el-tab-pane>

        <el-tab-pane label="合同决算">
          <el-descriptions :column="3" border>
            <el-descriptions-item label="供应商信息">{{ project.supplierInfo || '-' }}</el-descriptions-item>
            <el-descriptions-item label="服务内容">{{ project.serviceContent || '-' }}</el-descriptions-item>
            <el-descriptions-item label="中标价或合同价">{{ money(project.winningOrContractAmount) }}</el-descriptions-item>
            <el-descriptions-item label="中标/合同价">{{ money(project.bidContractAmount) }}</el-descriptions-item>
            <el-descriptions-item label="合同变更价">{{ money(project.contractChangeAmount) }}</el-descriptions-item>
            <el-descriptions-item label="调减/调增%">{{ percent(project.adjustmentRate) }}</el-descriptions-item>
            <el-descriptions-item label="竣工决算价">{{ money(project.finalAccountAmount) }}</el-descriptions-item>
            <el-descriptions-item label="累计拨付金额">{{ money(project.accumulatedPaymentAmount) }}</el-descriptions-item>
            <el-descriptions-item label="未拨付金额">{{ money(project.unpaidAmount) }}</el-descriptions-item>
          </el-descriptions>
        </el-tab-pane>

        <el-tab-pane label="拨付支付">
          <el-descriptions :column="3" border style="margin-bottom: 14px">
            <el-descriptions-item label="累计拨付金额">{{ money(project.accumulatedPaymentAmount) }}</el-descriptions-item>
            <el-descriptions-item label="未拨付金额">{{ money(project.unpaidAmount) }}</el-descriptions-item>
            <el-descriptions-item label="拨款进度">{{ percent(project.paymentProgress) }}</el-descriptions-item>
          </el-descriptions>
          <el-table :data="project.payments" border>
            <el-table-column prop="label" label="支付批次" width="130" />
            <el-table-column prop="paymentYear" label="付款年份" width="120" />
            <el-table-column prop="date" label="日期" width="140" />
            <el-table-column prop="amount" label="金额" min-width="140">
              <template #default="{ row }">{{ money(row.amount) }}</template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <el-tab-pane label="进度预警">
          <el-table :data="warnings" border>
            <el-table-column prop="type" label="预警类型" width="150" />
            <el-table-column prop="level" label="等级" width="90"><template #default="{ row }"><StatusTag :value="row.level" /></template></el-table-column>
            <el-table-column prop="reason" label="触发原因" min-width="280" />
            <el-table-column prop="status" label="处理状态" width="100"><template #default="{ row }"><StatusTag :value="row.status" /></template></el-table-column>
            <el-table-column prop="handler" label="处理人" width="100" />
            <el-table-column prop="note" label="处理备注" min-width="180" />
          </el-table>
        </el-tab-pane>

        <el-tab-pane label="更新日志">
          <el-timeline>
            <el-timeline-item v-for="log in project.logs" :key="log.id" :timestamp="log.date">
              <strong>{{ log.author }}</strong>
              <div>{{ log.content }}</div>
            </el-timeline-item>
          </el-timeline>
        </el-tab-pane>
      </el-tabs>
    </section>
  </div>
  <section v-else class="panel empty-state">
    <el-empty description="未找到项目台账" />
    <el-button type="primary" @click="router.push('/projects')">返回项目台账</el-button>
  </section>
</template>
