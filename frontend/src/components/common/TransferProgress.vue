<template>
  <div class="transfer-progress">
    <h3>调岗申请进度</h3>
    <el-empty v-if="!requests.length" description="暂无调岗申请" :image-size="64" />
    <el-timeline v-else>
      <el-timeline-item
        v-for="item in requests"
        :key="item.id"
        :type="timelineType(item.status)"
        :timestamp="item.createdAt"
      >
        <el-card shadow="never">
          <div class="card-head">
            <el-tag :type="statusTagType[item.status]">{{ statusLabel[item.status] }}</el-tag>
            <span class="route">
              {{ item.targetDepartment }} / {{ item.targetPosition }} · {{ item.targetStore?.name ?? `门店#${item.targetStoreId}` }}
            </span>
          </div>
          <el-descriptions :column="1" size="small" border class="desc">
            <el-descriptions-item label="申请人">{{ item.applicant?.username ?? `用户#${item.applicantId}` }}</el-descriptions-item>
            <el-descriptions-item label="生效日期">{{ item.effectiveDate }}</el-descriptions-item>
            <el-descriptions-item label="处理结果">{{ resultText(item) }}</el-descriptions-item>
            <el-descriptions-item v-if="item.remark" label="备注">{{ item.remark }}</el-descriptions-item>
          </el-descriptions>
          <div v-if="item.status === 'PENDING'" class="actions">
            <el-button v-if="canWithdraw(item)" size="small" :loading="withdrawingId === item.id" @click="withdraw(item.id)">
              撤回申请
            </el-button>
            <span class="hint">等待老板审批确认</span>
          </div>
        </el-card>
      </el-timeline-item>
    </el-timeline>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { fetchTransferRequests, withdrawTransferRequest } from '@/api/transfer';
import { TransferStatus, TransferStatusLabel, TransferStatusTagType, type TransferStatusValue } from '@/constants/enums';
import { useAuthStore } from '@/stores/authStore';
import type { TransferRequest } from '@/types/transfer';

const props = defineProps<{ employeeId: number }>();
const emit = defineEmits<{ changed: [] }>();

const auth = useAuthStore();
const requests = ref<TransferRequest[]>([]);
const withdrawingId = ref<number | null>(null);

const statusLabel = TransferStatusLabel;
const statusTagType = TransferStatusTagType;

function timelineType(status: TransferStatusValue) {
  if (status === TransferStatus.APPROVED) return 'success' as const;
  if (status === TransferStatus.REJECTED) return 'danger' as const;
  if (status === TransferStatus.WITHDRAWN) return 'info' as const;
  return 'warning' as const;
}

function resultText(item: TransferRequest) {
  if (item.status === TransferStatus.APPROVED) {
    return `已通过，审批人：${item.approver?.username ?? '-'}，生效后档案已更新`;
  }
  if (item.status === TransferStatus.REJECTED) {
    return `已驳回${item.rejectReason ? `：${item.rejectReason}` : ''}`;
  }
  if (item.status === TransferStatus.WITHDRAWN) return '申请人已撤回';
  return '待老板确认';
}

function canWithdraw(item: TransferRequest) {
  if (item.status !== TransferStatus.PENDING) return false;
  if (auth.user?.role === 'OWNER') return true;
  return auth.user?.id === item.applicantId;
}

async function load() {
  const response = (await fetchTransferRequests({ employeeId: props.employeeId, pageSize: 100 })) as {
    data: { list: TransferRequest[] };
  };
  requests.value = response.data.list;
}

async function withdraw(id: number) {
  withdrawingId.value = id;
  try {
    await withdrawTransferRequest(id);
    ElMessage.success('申请已撤回');
    await load();
    emit('changed');
  } finally {
    withdrawingId.value = null;
  }
}

onMounted(load);
defineExpose({ reload: load });
</script>

<style scoped>
.transfer-progress {
  margin-top: 20px;
}

.card-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.route {
  color: #454b41;
  font-weight: 600;
}

.desc {
  margin-top: 4px;
}

.actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 10px;
}

.hint {
  color: #97a08f;
  font-size: 12px;
}
</style>
