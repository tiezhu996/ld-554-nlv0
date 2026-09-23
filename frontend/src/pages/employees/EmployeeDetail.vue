<template>
  <div class="employee-detail">
    <el-descriptions :column="1" border>
      <el-descriptions-item label="姓名">{{ employee?.name }}</el-descriptions-item>
      <el-descriptions-item label="工号">{{ employee?.employeeNo }}</el-descriptions-item>
      <el-descriptions-item label="部门">{{ employee?.department }}</el-descriptions-item>
      <el-descriptions-item label="职位">{{ employee?.position }}</el-descriptions-item>
      <el-descriptions-item label="薪资">{{ money(employee?.salary ?? 0) }}</el-descriptions-item>
    </el-descriptions>
    <TransferProgress v-if="employee" :key="employee.id" :employee-id="employee.id" @changed="$emit('changed')" />
  </div>
</template>

<script setup lang="ts">
import type { Employee } from '@/types/employee';
import { money } from '@/utils/format';
import TransferProgress from '@/components/common/TransferProgress.vue';

defineProps<{ employee: Employee | null }>();
defineEmits<{ changed: [] }>();
</script>

<style scoped>
.employee-detail {
  padding: 4px 2px;
}
</style>
