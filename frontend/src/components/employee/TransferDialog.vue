<template>
  <el-dialog
    :model-value="modelValue"
    title="发起调岗"
    width="460px"
    :close-on-click-modal="false"
    @update:model-value="$emit('update:modelValue', $event)"
    @closed="resetForm"
  >
    <el-alert title="调岗申请提交后需老板确认，通过后员工档案与生效排班才会更新。" type="info" :closable="false" show-icon style="margin-bottom: 16px" />
    <el-form ref="formRef" :model="form" :rules="rules" label-width="96px">
      <el-form-item label="调岗员工">
        <el-input :value="employee ? `${employee.name}（${employee.employeeNo}）` : ''" disabled />
      </el-form-item>
      <el-form-item label="当前部门/职位">
        <el-input :model-value="employee ? `${employee.department} / ${employee.position}` : ''" disabled />
      </el-form-item>
      <el-form-item label="目标部门" prop="targetDepartment">
        <el-input v-model="form.targetDepartment" placeholder="请输入目标部门" />
      </el-form-item>
      <el-form-item label="目标职位" prop="targetPosition">
        <el-input v-model="form.targetPosition" placeholder="请输入目标职位" />
      </el-form-item>
      <el-form-item label="接收门店" prop="targetStoreId">
        <el-select v-model="form.targetStoreId" placeholder="请选择接收门店" filterable style="width: 100%">
          <el-option v-for="store in storeStore.list" :key="store.id" :label="store.name" :value="store.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="生效日期" prop="effectiveDate">
        <el-date-picker
          v-model="form.effectiveDate"
          type="date"
          value-format="YYYY-MM-DD"
          :disabled-date="disablePast"
          placeholder="选择生效日期"
          style="width: 100%"
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="submit">提交申请</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue';
import type { FormInstance, FormRules } from 'element-plus';
import { ElMessage } from 'element-plus';
import { createTransfer } from '@/api/transfer';
import { useStoreStore } from '@/stores/storeStore';
import type { Employee } from '@/types/employee';

const props = defineProps<{ modelValue: boolean; employee: Employee | null }>();
const emit = defineEmits<{
  'update:modelValue': [boolean];
  submitted: [];
}>();

const storeStore = useStoreStore();
const formRef = ref<FormInstance>();
const submitting = ref(false);
const form = reactive({
  targetDepartment: '',
  targetPosition: '',
  targetStoreId: undefined as number | undefined,
  effectiveDate: ''
});

const rules: FormRules = {
  targetDepartment: [{ required: true, message: '请输入目标部门', trigger: 'blur' }],
  targetPosition: [{ required: true, message: '请输入目标职位', trigger: 'blur' }],
  targetStoreId: [{ required: true, message: '请选择接收门店', trigger: 'change' }],
  effectiveDate: [{ required: true, message: '请选择生效日期', trigger: 'change' }]
};

function disablePast(date: Date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date.getTime() < today.getTime();
}

watch(
  () => props.modelValue,
  (visible) => {
    if (visible) {
      void storeStore.load();
      form.targetDepartment = props.employee?.department ?? '';
      form.targetPosition = props.employee?.position ?? '';
      form.targetStoreId = undefined;
      form.effectiveDate = '';
    }
  }
);

function resetForm() {
  formRef.value?.clearValidate();
}

async function submit() {
  if (!props.employee || !form.targetStoreId) return;
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;
  submitting.value = true;
  try {
    await createTransfer({
      employeeId: props.employee.id,
      targetDepartment: form.targetDepartment,
      targetPosition: form.targetPosition,
      targetStoreId: form.targetStoreId,
      effectiveDate: form.effectiveDate
    });
    ElMessage.success('调岗申请已提交，等待老板确认');
    emit('update:modelValue', false);
    emit('submitted');
  } finally {
    submitting.value = false;
  }
}
</script>
