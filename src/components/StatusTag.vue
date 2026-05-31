<script setup>
defineProps({
  value: [String, Number]
})

const typeMap = {
  完成: 'success',
  已完成: 'success',
  启用: 'success',
  进行中: 'primary',
  未完成: 'warning',
  未开始: 'info',
  已暂停: 'warning',
  停用: 'info',
  待处理: 'danger',
  已处理: 'success',
  高: 'danger',
  中: 'warning',
  低: 'info',
  上级: 'success',
  镇级: 'primary',
  共担: 'warning'
}
</script>

<template>
  <el-tag :type="typeMap[value] || 'info'" effect="light">{{ value || '-' }}</el-tag>
</template>
