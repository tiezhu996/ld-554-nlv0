<template>
  <AppLayout>
    <div class="page-title">
      <h1>门店管理</h1>
      <el-segmented v-model="mode" :options="['卡片','表格']" />
    </div>
    <div v-if="mode === '卡片'" class="grid cols-3">
      <article v-for="store in stores.list" :key="store.id" class="panel store-card" @click="selected = store; detailVisible = true">
        <h2>{{ store.name }}</h2>
        <p>{{ store.address }}</p>
        <el-tag>{{ statusLabel[store.status] }}</el-tag>
        <small>{{ store.businessHours }} · {{ store.phone }}</small>
      </article>
    </div>
    <div v-else class="panel">
      <el-table :data="stores.list">
        <el-table-column prop="name" label="门店" />
        <el-table-column prop="address" label="地址" />
        <el-table-column prop="phone" label="电话" />
        <el-table-column label="状态"><template #default="{ row }">{{ statusLabel[row.status as keyof typeof statusLabel] }}</template></el-table-column>
      </el-table>
    </div>
    <div class="grid cols-2 lower">
      <div class="panel"><StoreCompare :stores="stores.list" /></div>
      <div class="panel">
        <h2>人员配置</h2>
        <el-table :data="employeeStore.list" size="small">
          <el-table-column label="员工" min-width="150">
            <template #default="{ row }">
              <EmployeeAvatar :name="row.name" :employee-no="row.employeeNo" />
            </template>
          </el-table-column>
          <el-table-column label="所属门店" min-width="120">
            <template #default="{ row }">{{ storeName(row.storeId) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="90">
            <template #default="{ row }">
              <!-- 原调岗入口：统一走调岗申请弹窗，仅店长可发起，老板只审批 -->
              <el-button v-permission="['MANAGER']" text type="primary" @click="openTransfer(row)">调岗</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <div v-if="isOwner" class="panel lower">
      <div class="pending-head">
        <h2>待确认调岗申请</h2>
        <el-button text @click="loadPending">刷新</el-button>
      </div>
      <el-empty v-if="!pendingTransfers.length" description="暂无待确认申请" :image-size="56" />
      <el-table v-else :data="pendingTransfers" size="small">
        <el-table-column label="员工" min-width="120">
          <template #default="{ row }">{{ row.employee?.name }}（{{ row.employee?.employeeNo }}）</template>
        </el-table-column>
        <el-table-column label="申请人" min-width="100">
          <template #default="{ row }">{{ row.applicant?.profile?.name ?? row.applicant?.username }}</template>
        </el-table-column>
        <el-table-column label="目标门店" min-width="120">
          <template #default="{ row }">{{ row.targetStore?.name }}</template>
        </el-table-column>
        <el-table-column prop="targetDepartment" label="目标部门" min-width="110" />
        <el-table-column prop="targetPosition" label="目标职位" min-width="100" />
        <el-table-column prop="effectiveDate" label="生效日期" min-width="100" />
        <el-table-column label="操作" width="150">
          <template #default="{ row }">
            <el-button text type="success" @click="review(true, row)">确认</el-button>
            <el-button text type="danger" @click="review(false, row)">驳回</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-drawer v-model="detailVisible" title="门店详情"><StoreDetail :store="selected" /></el-drawer>
    <TransferDialog v-model="transferVisible" :employee="transferEmployee" @submitted="refreshAll" />
  </AppLayout>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { ElMessage } from 'element-plus';
import AppLayout from '@/components/layout/AppLayout.vue';
import EmployeeAvatar from '@/components/common/EmployeeAvatar.vue';
import StoreCompare from './StoreCompare.vue';
import StoreDetail from './StoreDetail.vue';
import TransferDialog from '@/components/employee/TransferDialog.vue';
import { useStoreStore } from '@/stores/storeStore';
import { useEmployeeStore } from '@/stores/employeeStore';
import { useTransferStore } from '@/stores/transferStore';
import { usePermission } from '@/hooks/usePermission';
import { approveTransfer, rejectTransfer } from '@/api/transfer';
import type { Store } from '@/types/store';
import type { Employee } from '@/types/employee';
import type { TransferRequest } from '@/types/transfer';

const stores = useStoreStore();
const employeeStore = useEmployeeStore();
const transferStore = useTransferStore();
const { isOwner } = usePermission();
const mode = ref('卡片');
const detailVisible = ref(false);
const selected = ref<Store | null>(null);
const statusLabel = { OPEN: '营业中', RENOVATING: '装修中', CLOSED: '已关闭' };

const transferVisible = ref(false);
const transferEmployee = ref<Employee | null>(null);
const pendingTransfers = ref<TransferRequest[]>([]);

function storeName(storeId: number | null) {
  return stores.list.find((store) => store.id === storeId)?.name ?? '—';
}

function openTransfer(row: Employee) {
  transferEmployee.value = row;
  transferVisible.value = true;
}

async function loadPending() {
  await transferStore.load({ status: 'PENDING' });
  pendingTransfers.value = transferStore.list;
}

async function refreshAll() {
  await employeeStore.load();
  await loadPending();
}

async function review(approved: boolean, row: TransferRequest) {
  if (approved) {
    await approveTransfer(row.id);
    ElMessage.success('已确认通过，员工档案与生效排班已更新');
  } else {
    const comment = (window.prompt('请填写驳回原因（必填）') ?? '').trim();
    if (!comment) {
      ElMessage.warning('驳回必须填写原因');
      return;
    }
    await rejectTransfer(row.id, comment);
    ElMessage.success('已驳回');
  }
  await loadPending();
}

onMounted(async () => {
  await stores.load();
  await employeeStore.load();
  if (isOwner.value) await loadPending();
});
</script>

<style scoped>
.store-card {
  cursor: pointer;
}

.store-card h2 {
  margin: 0 0 8px;
}

.store-card p {
  min-height: 44px;
  color: #697066;
}

.store-card small {
  display: block;
  margin-top: 16px;
}

.lower {
  margin-top: 18px;
}

.pending-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.pending-head h2 {
  margin: 0;
}
</style>
