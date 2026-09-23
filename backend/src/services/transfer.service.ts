import { Op, type WhereOptions, type Transaction } from 'sequelize';
import { Employee, Shift, Store, TransferRequest, User } from '../models/index.js';
import { sequelize } from '../config/database.js';
import { TransferStatus, type TransferStatusValue } from '../constants/enums.js';
import { getPagination } from '../utils/pagination.js';
import type { AuthUser } from '../types/request.js';

const detailInclude = [
  { model: Employee, as: 'employee', attributes: ['id', 'name', 'employeeNo', 'department', 'position', 'storeId'] },
  { model: Store, as: 'targetStore', attributes: ['id', 'name'] },
  { model: User, as: 'applicant', attributes: ['id', 'username'] },
  { model: User, as: 'approver', attributes: ['id', 'username'] }
];

function notFound(message: string) {
  return Object.assign(new Error(message), { status: 404 });
}

function conflict(message: string) {
  return Object.assign(new Error(message), { status: 409 });
}

export function listScope(user?: AuthUser): WhereOptions {
  if (!user || user.role === 'OWNER') return {};
  if (user.role === 'MANAGER' && user.storeId) {
    return { [Op.or]: [{ '$employee.storeId$': user.storeId }, { applicantId: user.id }] };
  }
  if (user.role === 'EMPLOYEE' && user.employeeId) return { employeeId: user.employeeId };
  return { id: { [Op.eq]: null } };
}

export async function listTransferRequests(query: Record<string, unknown>, user?: AuthUser) {
  const { page, pageSize, limit, offset } = getPagination(query);
  const where: WhereOptions = { ...listScope(user) };
  if (query.status) Object.assign(where, { status: query.status });
  if (query.employeeId) Object.assign(where, { employeeId: Number(query.employeeId) });
  const { rows, count } = await TransferRequest.findAndCountAll({
    where,
    include: detailInclude,
    limit,
    offset,
    order: [['id', 'DESC']],
    subQuery: false
  });
  return { list: rows, total: count, page, pageSize };
}

export async function getTransferRequest(id: number) {
  const request = await TransferRequest.findByPk(id, { include: detailInclude });
  if (!request) throw notFound('调岗申请不存在');
  return request;
}

export async function listEmployeeTransferRequests(employeeId: number, user?: AuthUser) {
  const where: WhereOptions = { employeeId, ...listScope(user) };
  return TransferRequest.findAll({ where, include: detailInclude, order: [['id', 'DESC']] });
}

export async function createTransferRequest(payload: Record<string, unknown>, user: AuthUser) {
  const employeeId = Number(payload.employeeId);
  const targetStoreId = Number(payload.targetStoreId);
  const targetDepartment = String(payload.targetDepartment ?? '').trim();
  const targetPosition = String(payload.targetPosition ?? '').trim();
  const effectiveDate = String(payload.effectiveDate ?? '');

  const employee = await Employee.findByPk(employeeId);
  if (!employee) throw notFound('员工不存在');
  if (employee.status === 'RESIGNED') throw conflict('离职员工不能发起调岗');

  const targetStore = await Store.findByPk(targetStoreId);
  if (!targetStore) throw notFound('接收门店不存在');
  if (targetStore.status === 'CLOSED') throw conflict('已关闭的门店不能接收调岗');
  if (employee.storeId === targetStoreId) throw conflict('接收门店与员工当前门店相同，无需调岗');

  if (user.role === 'MANAGER' && user.storeId && employee.storeId !== user.storeId) {
    throw Object.assign(new Error('只能为本门店员工发起调岗'), { status: 403 });
  }

  try {
    return await sequelize.transaction(async (transaction) => {
      // 行锁员工，串行化同一员工的申请创建，配合 DB 唯一索引兜底并发
      await Employee.findByPk(employeeId, { transaction, lock: transaction.LOCK.UPDATE });
      const pending = await TransferRequest.findOne({
        where: { employeeId, status: TransferStatus.PENDING },
        transaction,
        lock: transaction.LOCK.UPDATE
      });
      if (pending) throw conflict('该员工已有待处理的调岗申请，不能重复提交');

      return TransferRequest.create(
        {
          employeeId,
          targetDepartment,
          targetPosition,
          targetStoreId,
          effectiveDate,
          status: TransferStatus.PENDING,
          applicantId: user.id,
          remark: payload.remark ? String(payload.remark) : null
        },
        { transaction }
      );
    });
  } catch (error) {
    if ((error as { original?: { code?: string } }).original?.code === 'ER_DUP_ENTRY') {
      throw conflict('该员工已有待处理的调岗申请，不能重复提交');
    }
    throw error;
  }
}

async function lockPendingRequest(id: number, transaction: Transaction) {
  const request = await TransferRequest.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
  if (!request) throw notFound('调岗申请不存在');
  if (request.status !== TransferStatus.PENDING) throw conflict('调岗申请已处理，不能重复操作');
  return request;
}

export async function reviewTransferRequest(
  id: number,
  body: { approved: boolean; rejectReason?: string },
  user: AuthUser
) {
  const approved = Boolean(body.approved);
  return sequelize.transaction(async (transaction) => {
    const request = await lockPendingRequest(id, transaction);

    if (!approved) {
      request.status = TransferStatus.REJECTED as TransferStatusValue;
      request.approverId = user.id;
      request.rejectReason = body.rejectReason ? String(body.rejectReason).slice(0, 255) : null;
      request.processedAt = new Date();
      await request.save({ transaction });
      return { request, transferredShiftCount: 0 };
    }

    const employee = await Employee.findByPk(request.employeeId, { transaction, lock: transaction.LOCK.UPDATE });
    if (!employee) throw notFound('员工不存在');

    const targetStore = await Store.findByPk(request.targetStoreId, { transaction });
    if (!targetStore) throw notFound('接收门店不存在');

    // 生效日期当天及以后、尚未打卡的排班跟随转店；已打卡或更早的排班保留原样
    const [affectedCount] = await Shift.update(
      { storeId: request.targetStoreId },
      {
        where: {
          employeeId: request.employeeId,
          date: { [Op.gte]: request.effectiveDate },
          status: { [Op.ne]: 'CHECKED_IN' }
        },
        transaction
      }
    );

    // 老板确认后员工档案才更新
    employee.department = request.targetDepartment;
    employee.position = request.targetPosition;
    employee.storeId = request.targetStoreId;
    await employee.save({ transaction });

    request.status = TransferStatus.APPROVED as TransferStatusValue;
    request.approverId = user.id;
    request.approvedAt = new Date();
    request.processedAt = request.approvedAt;
    await request.save({ transaction });

    return { request, transferredShiftCount: affectedCount };
  });
}

export async function withdrawTransferRequest(id: number, user: AuthUser) {
  return sequelize.transaction(async (transaction) => {
    const request = await lockPendingRequest(id, transaction);
    if (user.role !== 'OWNER' && request.applicantId !== user.id) {
      throw Object.assign(new Error('只能撤回本人提交的调岗申请'), { status: 403 });
    }
    request.status = TransferStatus.WITHDRAWN as TransferStatusValue;
    request.processedAt = new Date();
    await request.save({ transaction });
    return request;
  });
}

/** 老的员工编辑入口禁止借调岗字段绕过审批流 */
export function assertNoBypassFields(payload: Record<string, unknown>) {
  if (payload.storeId !== undefined) {
    throw Object.assign(new Error('门店变更必须通过调岗申请审批，不能直接修改员工门店'), { status: 403 });
  }
}
