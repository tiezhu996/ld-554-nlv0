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
        <el-select v-model="staffStoreId" placeholder="选择门店" class="staff-select" @change="loadStaff">
          <el-option v-for="store in stores.list" :key="store.id" :label="store.name" :value="store.id" />
        </el-select>
        <el-empty v-if="!staff.length" description="该门店暂无员工" :image-size="60" />
        <div v-for="member in staff" :key="member.id" class="staff-row">
          <EmployeeAvatar :name="member.name" :employee-no="member.employeeNo" />
          <el-button v-permission="['OWNER','MANAGER']" text type="primary" @click="openTransfer(member)">调岗</el-button>
        </div>
      </div>
    </div>
    <el-drawer v-model="detailVisible" title="门店详情"><StoreDetail :store="selected" /></el-drawer>
    <TransferRequestDialog v-model="transferVisible" :employee="transferEmployee" @submitted="loadStaff" />
  </AppLayout>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import AppLayout from '@/components/layout/AppLayout.vue';
import EmployeeAvatar from '@/components/common/EmployeeAvatar.vue';
import StoreCompare from './StoreCompare.vue';
import StoreDetail from './StoreDetail.vue';
import TransferRequestDialog from '@/components/common/TransferRequestDialog.vue';
import { useStoreStore } from '@/stores/storeStore';
import { fetchEmployees } from '@/api/employee';
import type { Store } from '@/types/store';
import type { Employee } from '@/types/employee';

const stores = useStoreStore();
const mode = ref('卡片');
const detailVisible = ref(false);
const selected = ref<Store | null>(null);
const statusLabel = { OPEN: '营业中', RENOVATING: '装修中', CLOSED: '已关闭' };

const staffStoreId = ref<number>();
const staff = ref<Employee[]>([]);
const transferVisible = ref(false);
const transferEmployee = ref<Employee | null>(null);

async function loadStaff() {
  if (!staffStoreId.value) {
    staff.value = [];
    return;
  }
  const response = (await fetchEmployees({ storeId: staffStoreId.value, pageSize: 100 })) as {
    data: { list: Employee[] };
  };
  staff.value = response.data.list;
}

function openTransfer(member: Employee) {
  transferEmployee.value = member;
  transferVisible.value = true;
}

onMounted(async () => {
  await stores.load();
  staffStoreId.value = stores.list[0]?.id;
  await loadStaff();
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

.staff-select {
  width: 100%;
  margin-bottom: 12px;
}

.staff-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 0;
}
</style>
