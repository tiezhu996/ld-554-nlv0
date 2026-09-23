export const employeeRoutes = [
  { path: '/employees', name: 'employees', component: () => import('@/pages/employees/EmployeeList.vue'), meta: { roles: ['OWNER', 'MANAGER', 'EMPLOYEE'] } },
  { path: '/employees/transfers', name: 'transfer-approval', component: () => import('@/pages/employees/TransferApproval.vue'), meta: { roles: ['OWNER', 'MANAGER'] } }
];
