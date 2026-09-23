import { Op, Sequelize, col, type WhereOptions, type Transaction } from 'sequelize';
import { Employee, Shift, Store, TransferRequest, User } from '../models/index.js';
import { sequelize } from '../config/database.js';
import { getPagination } from '../utils/pagination.js';
import { TransferStatus } from '../constants/enums.js';
import type { AuthUser } from '../types/request.js';

function httpError(message: string, status = 400) {
  return Object.assign(new Error(message), { status });
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

const requestInclude = [
  { model: Employee, as: 'employee' },
  { model: Store, as: 'targetStore' },
  { model: User, as: 'applicant', include: [{ association: 'profile' }] },
  { model: User, as: 'reviewer', include: [{ association: 'profile' }] }
];

function scopeFor(user: AuthUser): WhereOptions {
  if (user.role === 'OWNER') return {};
  if (user.role === 'MANAGER' && user.storeId) {
    // 本门店员工的申请，或本人提交的申请
    return {
      [Op.or]: [Sequelize.where(col('employee.storeId'), user.storeId), { applicantId: user.id }]
    };
  }
  return { employeeId: user.employeeId ?? -1 };
}

export async function listTransfers(query: Record<string, unknown>, user: AuthUser) {
  const { page, pageSize, limit, offset } = getPagination(query);
  const where: WhereOptions = { ...scopeFor(user) };
  if (query.status) Object.assign(where, { status: query.status });
  if (query.employeeId) Object.assign(where, { employeeId: Number(query.employeeId) });
  const { rows, count } = await TransferRequest.findAndCountAll({
    where,
    limit,
    offset,
    include: requestInclude,
    order: [['id', 'DESC']],
    subQuery: false
  });
  return { list: rows, total: count, page, pageSize };
}

export async function getTransfer(id: number, user: AuthUser) {
  const transfer = await TransferRequest.findByPk(id, { include: requestInclude });
  if (!transfer) throw httpError('调岗申请不存在', 404);
  if (user.role !== 'OWNER' && transfer.employeeId !== user.employeeId && transfer.applicantId !== user.id) {
    if (!(user.role === 'MANAGER' && user.storeId && transfer.employee?.storeId === user.storeId)) {
      throw httpError('无权限查看该调岗申请', 403);
    }
  }
  return transfer;
}

async function assertEmployeeManageable(employee: Employee | null, user: AuthUser) {
  if (!employee) throw httpError('员工不存在', 404);
  if (employee.status === 'RESIGNED') throw httpError('离职员工不能发起调岗');
  if (user.role === 'MANAGER') {
    if (!user.storeId || employee.storeId !== user.storeId) throw httpError('只能调岗本门店员工', 403);
  }
}

export async function createTransfer(payload: Record<string, unknown>, user: AuthUser) {
  const employeeId = Number(payload.employeeId);
  const targetDepartment = String(payload.targetDepartment ?? '').trim();
  const targetPosition = String(payload.targetPosition ?? '').trim();
  const targetStoreId = Number(payload.targetStoreId);
  const effectiveDate = String(payload.effectiveDate ?? '');

  if (!employeeId || !targetDepartment || !targetPosition || !targetStoreId || !effectiveDate) {
    throw httpError('目标部门、职位、接收门店和生效日期均为必填项');
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(effectiveDate) || effectiveDate < today()) {
    throw httpError('生效日期不能早于今天');
  }

  return sequelize.transaction(async (transaction) => {
    // 锁定员工行，保证同一员工的并发提交串行化
    const locked = await Employee.findByPk(employeeId, { transaction, lock: transaction.LOCK.UPDATE });
    await assertEmployeeManageable(locked, user);

    const targetStore = await Store.findByPk(targetStoreId, { transaction });
    if (!targetStore) throw httpError('接收门店不存在', 404);
    if (locked!.storeId === targetStoreId) throw httpError('接收门店与员工当前门店相同，无需调岗');

    const pending = await TransferRequest.findOne({
      where: { employeeId, status: TransferStatus.PENDING },
      transaction,
      lock: transaction.LOCK.UPDATE
    });
    if (pending) throw httpError('该员工已有待处理的调岗申请，不能重复提交', 409);

    return TransferRequest.create(
      {
        employeeId,
        applicantId: user.id,
        targetDepartment,
        targetPosition,
        targetStoreId,
        effectiveDate,
        status: TransferStatus.PENDING
      },
      { transaction }
    );
  });
}

async function settleApproved(transfer: TransferRequest, transaction: Transaction) {
  // 1. 更新员工档案：部门、职位、所属门店
  await Employee.update(
    { department: transfer.targetDepartment, position: transfer.targetPosition, storeId: transfer.targetStoreId },
    { where: { id: transfer.employeeId }, transaction }
  );
  // 员工登录账号的门店数据范围同步到接收门店，避免仍按原门店过滤
  await User.update({ storeId: transfer.targetStoreId }, { where: { employeeId: transfer.employeeId }, transaction });

  // 2. 生效日期当天及以后、尚未打卡的排班转到接收门店；已打卡或更早的排班保留原样
  const shiftWhere = {
    employeeId: transfer.employeeId,
    date: { [Op.gte]: transfer.effectiveDate },
    status: { [Op.ne]: 'CHECKED_IN' }
  };
  const affectedCount = await Shift.count({ where: shiftWhere, transaction });
  await Shift.update({ storeId: transfer.targetStoreId }, { where: shiftWhere, transaction });
  transfer.transferredShiftCount = affectedCount;
}

export async function reviewTransfer(id: number, approved: boolean, payload: Record<string, unknown>, user: AuthUser) {
  const comment = payload.comment === undefined ? null : String(payload.comment).slice(0, 255);
  const reviewedAt = new Date();

  return sequelize.transaction(async (transaction) => {
    const transfer = await TransferRequest.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!transfer) throw httpError('调岗申请不存在', 404);
    // 条件更新：只有仍处于待处理状态的申请可以落终态。审批与撤回同时到达时，先到者生效
    const targetStatus = approved ? TransferStatus.APPROVED : TransferStatus.REJECTED;
    const [affected] = await TransferRequest.update(
      { status: targetStatus, reviewerId: user.id, reviewComment: comment, reviewedAt },
      { where: { id, status: TransferStatus.PENDING }, transaction }
    );
    if (affected === 0) throw httpError(`该申请已${transfer.status === TransferStatus.PENDING ? '关闭' : '被处理'}，无法重复审批`, 409);

    transfer.status = targetStatus;
    transfer.reviewerId = user.id;
    transfer.reviewComment = comment;
    transfer.reviewedAt = reviewedAt;

    if (approved) await settleApproved(transfer, transaction);
    return transfer.save({ transaction });
  });
}

export async function withdrawTransfer(id: number, user: AuthUser) {
  return sequelize.transaction(async (transaction) => {
    // 锁定申请行，与审批互斥；审批和撤回同时到达时只有条件更新命中的一方生效
    const transfer = await TransferRequest.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!transfer) throw httpError('调岗申请不存在', 404);
    if (transfer.applicantId !== user.id) throw httpError('只能撤回本人提交的调岗申请', 403);
    const [affected] = await TransferRequest.update(
      { status: TransferStatus.WITHDRAWN },
      { where: { id, applicantId: user.id, status: TransferStatus.PENDING }, transaction }
    );
    if (affected === 0) throw httpError('申请已被处理，无法撤回', 409);
    return TransferRequest.findByPk(id, { transaction, include: requestInclude });
  });
}
