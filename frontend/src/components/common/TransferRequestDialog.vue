<template>
  <el-dialog
    :model-value="modelValue"
    title="门店人员调岗申请"
    width="460px"
    :close-on-click-modal="false"
    @update:model-value="$emit('update:modelValue', $event)"
    @open="handleOpen"
  >
    <el-alert
      v-if="pending"
      type="warning"
      :closable="false"
      show-icon
      title="该员工已有待处理的调岗申请"
      description="同一员工在申请处理完成前不能再次提交。"
      class="pending-alert"
    />
    <el-form ref="formRef" :model="form" :rules="rules" label-width="96px">
      <el-form-item label="员工">
        <span>{{ employee?.name }}（{{ employee?.employeeNo }}）</span>
      </el-form-item>
      <el-form-item label="当前门店"><span>{{ currentStoreName }}</span></el-form-item>
      <el-form-item label="目标部门" prop="targetDepartment">
        <el-input v-model="form.targetDepartment" placeholder="如：门店运营部" />
      </el-form-item>
      <el-form-item label="目标职位" prop="targetPosition">
        <el-input v-model="form.targetPosition" placeholder="如：值班主管" />
      </el-form-item>
      <el-form-item label="接收门店" prop="targetStoreId">
        <el-select v-model="form.targetStoreId" placeholder="选择接收门店" filterable>
          <el-option
            v-for="store in storeStore.list"
            :key="store.id"
            :label="store.name"
            :value="store.id"
            :disabled="store.status === 'CLOSED'"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="生效日期" prop="effectiveDate">
        <el-date-picker
          v-model="form.effectiveDate"
          type="date"
          value-format="YYYY-MM-DD"
          :disabled-date="disablePast"
          placeholder="选择生效日期"
        />
      </el-form-item>
      <el-form-item label="备注">
        <el-input v-model="form.remark" type="textarea" :rows="2" maxlength="255" show-word-limit />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" :loading="submitting" :disabled="pending" @click="submit">提交申请</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import { useStoreStore } from '@/stores/storeStore';
import { createTransferRequest, fetchTransferRequests } from '@/api/transfer';
import type { Employee } from '@/types/employee';
import type { TransferRequest } from '@/types/transfer';

const props = defineProps<{ modelValue: boolean; employee: Employee | null }>();
const emit = defineEmits<{ 'update:modelValue': [boolean]; submitted: [] }>();

const storeStore = useStoreStore();
const formRef = ref<FormInstance>();
const submitting = ref(false);
const pending = ref<TransferRequest | null>(null);

const form = reactive({
  targetDepartment: '',
  targetPosition: '',
  targetStoreId: undefined as number | undefined,
  effectiveDate: '',
  remark: ''
});

const currentStoreName = computed(
  () => storeStore.list.find((store) => store.id === props.employee?.storeId)?.name ?? '未分配门店'
);

const rules: FormRules = {
  targetDepartment: [{ required: true, message: '请填写目标部门', trigger: 'blur' }],
  targetPosition: [{ required: true, message: '请填写目标职位', trigger: 'blur' }],
  targetStoreId: [
    { required: true, message: '请选择接收门店', trigger: 'change' },
    {
      validator: (_rule, value: number, callback) => {
        if (props.employee && value === props.employee.storeId) {
          callback(new Error('接收门店不能与当前门店相同'));
        } else {
          callback();
        }
      },
      trigger: 'change'
    }
  ],
  effectiveDate: [{ required: true, message: '请选择生效日期', trigger: 'change' }]
};

function disablePast(date: Date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date.getTime() < today.getTime();
}

function resetForm() {
  form.targetDepartment = props.employee?.department ?? '';
  form.targetPosition = props.employee?.position ?? '';
  form.targetStoreId = undefined;
  form.effectiveDate = new Date().toISOString().slice(0, 10);
  form.remark = '';
  formRef.value?.clearValidate();
}

async function handleOpen() {
  await storeStore.load();
  resetForm();
  pending.value = null;
  if (!props.employee) return;
  const response = (await fetchTransferRequests({ employeeId: props.employee.id, status: 'PENDING' })) as {
    data: { list: TransferRequest[] };
  };
  pending.value = response.data.list[0] ?? null;
}

async function submit() {
  if (!props.employee || !formRef.value) return;
  const valid = await formRef.value.validate().catch(() => false);
  if (!valid) return;
  submitting.value = true;
  try {
    await createTransferRequest({ employeeId: props.employee.id, ...form });
    ElMessage.success('调岗申请已提交，等待老板审批');
    emit('update:modelValue', false);
    emit('submitted');
  } finally {
    submitting.value = false;
  }
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) void handleOpen();
  }
);
</script>

<style scoped>
.pending-alert {
  margin-bottom: 16px;
}
</style>
