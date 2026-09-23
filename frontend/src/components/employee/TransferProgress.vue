<template>
  <div class="transfer-progress">
    <div class="section-title">
      <h3>调岗申请进度</h3>
      <el-tag v-if="pendingCount" type="warning" size="small">1 条待确认</el-tag>
    </div>
    <el-empty v-if="!requests.length" description="暂无调岗记录" :image-size="64" />
    <el-timeline v-else>
      <el-timeline-item
        v-for="item in requests"
        :key="item.id"
        :type="timelineType(item.status)"
        :timestamp="formatTime(item.updatedAt || item.createdAt)"
      >
        <el-card shadow="never">
          <div class="record-head">
            <el-tag :type="tagType(item.status)" size="small">{{ getStatusLabel(item.status) }}</el-tag>
            <span class="target">
              {{ item.targetDepartment }} · {{ item.targetPosition }}
              <el-divider direction="vertical" />
              <el-icon><OfficeBuilding /></el-icon>{{ item.targetStore?.name ?? `门店#${item.targetStoreId}` }}
            </span>
          </div>
          <el-descriptions :column="1" size="small" border style="margin-top: 10px">
            <el-descriptions-item label="申请人">{{ applicantName(item) }}</el-descriptions-item>
            <el-descriptions-item label="生效日期">{{ item.effectiveDate }}</el-descriptions-item>
            <el-descriptions-item label="目标门店">{{ item.targetStore?.name ?? `门店#${item.targetStoreId}` }}</el-descriptions-item>
            <el-descriptions-item label="处理结果">{{ resultText(item) }}</el-descriptions-item>
          </el-descriptions>
          <div class="record-actions">
            <template v-if="item.status === TransferStatus.PENDING">
              <template v-if="canApprove">
                <el-button text type="success" @click="$emit('approve', item)">确认通过</el-button>
                <el-button text type="danger" @click="$emit('reject', item)">驳回</el-button>
              </template>
              <el-button v-if="canWithdraw(item)" text type="info" @click="$emit('withdraw', item)">撤回申请</el-button>
            </template>
          </div>
        </el-card>
      </el-timeline-item>
    </el-timeline>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { OfficeBuilding } from '@element-plus/icons-vue';
import { TransferStatus, TransferStatusLabel, TransferStatusTagType, type TransferStatusValue } from '@/constants/enums';
import { usePermission } from '@/hooks/usePermission';
import { useAuthStore } from '@/stores/authStore';
import type { TransferRequest } from '@/types/transfer';

const props = defineProps<{ requests: TransferRequest[] }>();
defineEmits<{
  approve: [TransferRequest];
  reject: [TransferRequest];
  withdraw: [TransferRequest];
}>();

const { isOwner } = usePermission();
const auth = useAuthStore();
const canApprove = computed(() => isOwner.value);
const pendingCount = computed(() => props.requests.filter((item) => item.status === TransferStatus.PENDING).length);

function canWithdraw(item: TransferRequest) {
  return item.applicantId === auth.user?.id;
}

function getStatusLabel(value: TransferStatusValue) {
  return TransferStatusLabel[value];
}

function tagType(value: TransferStatusValue) {
  return TransferStatusTagType[value];
}

function timelineType(value: TransferStatusValue): 'primary' | 'success' | 'danger' | 'info' {
  if (value === TransferStatus.PENDING) return 'primary';
  if (value === TransferStatus.APPROVED) return 'success';
  if (value === TransferStatus.REJECTED) return 'danger';
  return 'info';
}

function applicantName(item: TransferRequest) {
  return item.applicant?.profile?.name ?? item.applicant?.username ?? `用户#${item.applicantId}`;
}

function resultText(item: TransferRequest) {
  if (item.status === TransferStatus.PENDING) return '等待老板确认';
  if (item.status === TransferStatus.WITHDRAWN) return '申请人已撤回';
  const reviewer = item.reviewer?.profile?.name ?? item.reviewer?.username ?? '老板';
  const passed = item.status === TransferStatus.APPROVED;
  const comment = item.reviewComment ? `（${item.reviewComment}）` : '';
  const shifted = passed ? `，已同步 ${item.transferredShiftCount} 条排班至接收门店` : '';
  return `${reviewer}：${passed ? '确认通过' : '驳回'}${comment}${shifted}`;
}

function formatTime(value?: string | null) {
  if (!value) return '';
  return value.replace('T', ' ').slice(0, 16);
}
</script>

<style scoped>
.section-title {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.section-title h3 {
  margin: 0;
}

.record-head {
  display: flex;
  align-items: center;
  gap: 12px;
}

.target {
  color: #4a5147;
  font-size: 13px;
}

.record-actions {
  margin-top: 8px;
  text-align: right;
}
</style>
