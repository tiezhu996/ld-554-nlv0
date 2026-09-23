import { Router } from 'express';
import * as controller from '../controllers/transfer.controller.js';
import { UserRole } from '../constants/enums.js';
import { auditMiddleware } from '../middlewares/audit.middleware.js';
import { requireRoles } from '../middlewares/rbac.middleware.js';
import { requireFields } from '../middlewares/validator.middleware.js';

export const transferRoutes = Router();

// 调岗申请对申请人和老板可见，员工可查看本人申请进度
transferRoutes.get('/', controller.index);
transferRoutes.get('/:id', controller.show);

// 唯一发起入口：店长提交，写明目标部门、职位、接收门店和生效日期
transferRoutes.post(
  '/',
  requireRoles([UserRole.MANAGER]),
  requireFields(['employeeId', 'targetDepartment', 'targetPosition', 'targetStoreId', 'effectiveDate']),
  auditMiddleware('SUBMIT_TRANSFER', 'transfer_requests'),
  controller.create
);

// 老板确认 / 驳回；员工档案仅在确认通过后由服务端更新，PUT /employees 通道不能绕过
transferRoutes.post(
  '/:id/approve',
  requireRoles([UserRole.OWNER]),
  auditMiddleware('APPROVE_TRANSFER', 'transfer_requests'),
  controller.approve
);
transferRoutes.post(
  '/:id/reject',
  requireRoles([UserRole.OWNER]),
  auditMiddleware('REJECT_TRANSFER', 'transfer_requests'),
  controller.reject
);

// 申请人本人撤回待处理申请
transferRoutes.post('/:id/withdraw', auditMiddleware('WITHDRAW_TRANSFER', 'transfer_requests'), controller.withdraw);
