<template>
  <AppLayout>
    <div class="page-title">
      <h1>调岗审批</h1>
      <el-radio-group v-model="statusFilter" @change="load">
        <el-radio-button label="">全部</el-radio-button>
        <el-radio-button label="PENDING">待审批</el-radio-button>
        <el-radio-button label="APPROVED">已通过</el-radio-button>
        <el-radio-button label="REJECTED">已驳回</el-radio-button>
        <el-radio-button label="WITHDRAWN">已撤回</el-radio-button>
      </el-radio-group>
    </div>
    <div class="panel">
      <el-table v-loading="loading" :data="requests.list">
        <el-table-column label="员工" min-width="160">
          <template #default="{ row }">
            {{ row.employee?.name ?? '-' }}
            <small class="muted">（{{ row.employee?.employeeNo }}）</small>
          </template>
        </el-table-column>
        <el-table-column label="调岗去向" min-width="220">
          <template #default="{ row }">
            {{ row.targetDepartment }} / {{ row.targetPosition }} · {{ row.targetStore?.name ?? `门店#${row.targetStoreId}` }}
          </template>
        </el-table-column>
        <el-table-column prop="effectiveDate" label="生效日期" width="120" />
        <el-table-column label="申请人" width="110">
          <template #default="{ row }">{{ row.applicant?.username ?? `用户#${row.applicantId}` }}</template>
        </el-table-column>
        <el-table-column prop="createdAt" label="提交时间" width="180">
          <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="statusTagType[row.status as TransferStatusValue]">
              {{ statusLabel[row.status as TransferStatusValue] }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="处理结果" min-width="200">
          <template #default="{ row }">{{ resultText(row) }}</template>
        </el-table-column>
        <el-table-column v-if="isOwner" label="操作" width="170" fixed="right">
          <template #default="{ row }">
            <template v-if="row.status === 'PENDING'">
              <el-button text type="success" @click="approve(row)">通过</el-button>
              <el-button text type="danger" @click="openReject(row)">驳回</el-button>
            </template>
            <el-button v-else-if="canWithdraw(row)" text @click="withdraw(row)">撤回</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination
        class="pager"
        layout="total, prev, pager, next"
        :total="requests.total"
        :current-page="page"
        :page-size="20"
        @current-change="handlePageChange"
      />
    </div>

    <el-dialog v-model="rejectVisible" title="驳回调岗申请" width="420px">
      <el-form>
        <el-form-item label="员工"><span>{{ rejectRow?.employee?.name }}</span></el-form-item>
        <el-form-item label="驳回原因">
          <el-input v-model="rejectReason" type="textarea" :rows="3" maxlength="255" show-word-limit />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="rejectVisible = false">取消</el-button>
        <el-button type="danger" :loading="submitting" @click="confirmReject">确认驳回</el-button>
      </template>
    </el-dialog>
  </AppLayout>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import AppLayout from '@/components/layout/AppLayout.vue';
import { reviewTransferRequest, withdrawTransferRequest } from '@/api/transfer';
import { useTransferStore } from '@/stores/transferStore';
import { useAuthStore } from '@/stores/authStore';
import { usePermission } from '@/hooks/usePermission';
import { TransferStatusLabel, TransferStatusTagType, type TransferStatusValue } from '@/constants/enums';
import { formatDateTime } from '@/utils/format';
import type { TransferRequest } from '@/types/transfer';

const requests = useTransferStore();
const { isOwner, role } = usePermission();
const auth = useAuthStore();
const loading = ref(false);
const submitting = ref(false);
const statusFilter = ref('PENDING');
const page = ref(1);
const rejectVisible = ref(false);
const rejectRow = ref<TransferRequest | null>(null);
const rejectReason = ref('');

const statusLabel = TransferStatusLabel;
const statusTagType = TransferStatusTagType;

function resultText(row: TransferRequest) {
  if (row.status === 'APPROVED') return `已通过（${row.approver?.username ?? '-'}），档案与未来排班已转店`;
  if (row.status === 'REJECTED') return row.rejectReason ? `已驳回：${row.rejectReason}` : '已驳回';
  if (row.status === 'WITHDRAWN') return '申请人已撤回';
  return '待老板确认';
}

function canWithdraw(row: TransferRequest) {
  return role.value === 'OWNER' || auth.user?.id === row.applicantId;
}

async function load() {
  loading.value = true;
  try {
    await requests.load({ status: statusFilter.value || undefined, page: page.value, pageSize: 20 });
  } finally {
    loading.value = false;
  }
}

function handlePageChange(p: number) {
  page.value = p;
  void load();
}

async function approve(row: TransferRequest) {
  await ElMessageBox.confirm(
    `确认通过 ${row.employee?.name} 调往 ${row.targetStore?.name} 的申请？通过后员工档案立即更新，生效日期当天及以后未打卡的排班将转至接收门店。`,
    '调岗审批',
    { type: 'warning', confirmButtonText: '确认通过', cancelButtonText: '取消' }
  );
  submitting.value = true;
  try {
    const res = (await reviewTransferRequest(row.id, { approved: true })) as {
      data: { transferredShiftCount: number };
    };
    ElMessage.success(`已通过，${res.data.transferredShiftCount} 条未来排班已转店`);
    await load();
  } finally {
    submitting.value = false;
  }
}

function openReject(row: TransferRequest) {
  rejectRow.value = row;
  rejectReason.value = '';
  rejectVisible.value = true;
}

async function confirmReject() {
  if (!rejectRow.value) return;
  submitting.value = true;
  try {
    await reviewTransferRequest(rejectRow.value.id, { approved: false, rejectReason: rejectReason.value });
    ElMessage.success('已驳回');
    rejectVisible.value = false;
    await load();
  } finally {
    submitting.value = false;
  }
}

async function withdraw(row: TransferRequest) {
  await ElMessageBox.confirm('确认撤回该调岗申请？撤回后不可恢复。', '撤回申请', { type: 'warning' });
  await withdrawTransferRequest(row.id);
  ElMessage.success('申请已撤回');
  await load();
}

onMounted(load);
</script>

<style scoped>
.muted {
  color: #97a08f;
}

.pager {
  margin-top: 16px;
  justify-content: flex-end;
}
</style>
