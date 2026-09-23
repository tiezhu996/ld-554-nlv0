<template>
  <div v-loading="loading" class="employee-detail">
    <el-descriptions :column="1" border>
      <el-descriptions-item label="姓名">{{ detail?.name }}</el-descriptions-item>
      <el-descriptions-item label="工号">{{ detail?.employeeNo }}</el-descriptions-item>
      <el-descriptions-item label="部门">{{ detail?.department }}</el-descriptions-item>
      <el-descriptions-item label="职位">{{ detail?.position }}</el-descriptions-item>
      <el-descriptions-item label="所属门店">{{ storeName }}</el-descriptions-item>
      <el-descriptions-item label="薪资">{{ money(detail?.salary ?? 0) }}</el-descriptions-item>
    </el-descriptions>

    <el-divider content-position="left">调岗记录</el-divider>
    <TransferProgress
      :requests="detail?.transferRequests ?? []"
      @approve="openReview(true, $event)"
      @reject="openReview(false, $event)"
      @withdraw="handleWithdraw"
    />

    <el-dialog v-model="reviewVisible" :title="reviewApproved ? '确认通过调岗' : '驳回调岗'" width="420px" append-to-body>
      <div v-if="reviewTarget" class="review-body">
        <p><strong>{{ reviewTarget.employee?.name }}</strong> → {{ reviewTarget.targetStore?.name }}</p>
        <p class="muted">{{ reviewTarget.targetDepartment }} · {{ reviewTarget.targetPosition }}，生效日期 {{ reviewTarget.effectiveDate }}</p>
        <el-input
          v-model="reviewComment"
          type="textarea"
          :rows="3"
          :placeholder="reviewApproved ? '备注（可选）' : '请填写驳回原因'"
        />
      </div>
      <template #footer>
        <el-button @click="reviewVisible = false">取消</el-button>
        <el-button :type="reviewApproved ? 'success' : 'danger'" :loading="reviewing" @click="submitReview">
          {{ reviewApproved ? '确认通过' : '确认驳回' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import TransferProgress from '@/components/employee/TransferProgress.vue';
import { approveTransfer, rejectTransfer, withdrawTransfer } from '@/api/transfer';
import { fetchEmployee } from '@/api/employee';
import { useStoreStore } from '@/stores/storeStore';
import { money } from '@/utils/format';
import type { Employee } from '@/types/employee';
import type { TransferRequest } from '@/types/transfer';

const props = defineProps<{ employee: Employee | null }>();

const storeStore = useStoreStore();
void storeStore.load();

const loading = ref(false);
const detail = ref<(Employee & { transferRequests?: TransferRequest[] }) | null>(null);
const reviewVisible = ref(false);
const reviewApproved = ref(true);
const reviewTarget = ref<TransferRequest | null>(null);
const reviewComment = ref('');
const reviewing = ref(false);

const storeName = computed(() => storeStore.list.find((store) => store.id === detail.value?.storeId)?.name ?? '—');

watch(
  () => props.employee?.id,
  async (id) => {
    if (!id) return;
    loading.value = true;
    try {
      const response = (await fetchEmployee(id)) as { data: Employee & { transferRequests?: TransferRequest[] } };
      detail.value = response.data;
    } finally {
      loading.value = false;
    }
  },
  { immediate: true }
);

async function refresh() {
  if (!props.employee) return;
  const response = (await fetchEmployee(props.employee.id)) as { data: Employee & { transferRequests?: TransferRequest[] } };
  detail.value = response.data;
}

function openReview(approved: boolean, item: TransferRequest) {
  reviewApproved.value = approved;
  reviewTarget.value = item;
  reviewComment.value = '';
  reviewVisible.value = true;
}

async function submitReview() {
  if (!reviewTarget.value) return;
  if (!reviewApproved.value && !reviewComment.value.trim()) {
    ElMessage.warning('请填写驳回原因');
    return;
  }
  reviewing.value = true;
  try {
    if (reviewApproved.value) {
      await approveTransfer(reviewTarget.value.id, reviewComment.value || undefined);
      ElMessage.success('已确认通过，员工档案与生效排班已更新');
    } else {
      await rejectTransfer(reviewTarget.value.id, reviewComment.value);
      ElMessage.success('已驳回该调岗申请');
    }
    reviewVisible.value = false;
    await refresh();
  } finally {
    reviewing.value = false;
  }
}

async function handleWithdraw(item: TransferRequest) {
  await ElMessageBox.confirm('撤回后该调岗申请将关闭，确认撤回吗？', '撤回调岗申请', { type: 'warning' });
  await withdrawTransfer(item.id);
  ElMessage.success('调岗申请已撤回');
  await refresh();
}
</script>

<style scoped>
.review-body .muted {
  color: #697066;
  font-size: 13px;
  margin: 6px 0 12px;
}
</style>
