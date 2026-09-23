import { Router } from 'express';
import * as controller from '../controllers/transfer.controller.js';
import { UserRole } from '../constants/enums.js';
import { auditMiddleware } from '../middlewares/audit.middleware.js';
import { requireRoles } from '../middlewares/rbac.middleware.js';
import { requireFields } from '../middlewares/validator.middleware.js';

export const transferRoutes = Router();

transferRoutes.get('/', controller.index);
transferRoutes.get('/:id', controller.show);
transferRoutes.post(
  '/',
  requireRoles([UserRole.OWNER, UserRole.MANAGER]),
  requireFields(['employeeId', 'targetDepartment', 'targetPosition', 'targetStoreId', 'effectiveDate']),
  auditMiddleware('CREATE_TRANSFER_REQUEST', 'transfer_requests'),
  controller.create
);
transferRoutes.post(
  '/:id/review',
  requireRoles([UserRole.OWNER]),
  auditMiddleware('REVIEW_TRANSFER_REQUEST', 'transfer_requests'),
  controller.review
);
transferRoutes.post(
  '/:id/withdraw',
  requireRoles([UserRole.OWNER, UserRole.MANAGER]),
  auditMiddleware('WITHDRAW_TRANSFER_REQUEST', 'transfer_requests'),
  controller.withdraw
);
