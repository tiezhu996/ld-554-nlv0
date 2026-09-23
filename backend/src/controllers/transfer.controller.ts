import type { NextFunction, Request, Response } from 'express';
import * as transferService from '../services/transfer.service.js';
import { success } from '../utils/response.js';

export async function index(req: Request, res: Response, next: NextFunction) {
  try {
    success(res, await transferService.listTransfers(req.query, req.user!));
  } catch (error) {
    next(error);
  }
}

export async function show(req: Request, res: Response, next: NextFunction) {
  try {
    success(res, await transferService.getTransfer(Number(req.params.id), req.user!));
  } catch (error) {
    next(error);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    success(res, await transferService.createTransfer(req.body, req.user!), '调岗申请已提交');
  } catch (error) {
    next(error);
  }
}

export async function approve(req: Request, res: Response, next: NextFunction) {
  try {
    success(res, await transferService.reviewTransfer(Number(req.params.id), true, req.body, req.user!), '调岗申请已确认通过');
  } catch (error) {
    next(error);
  }
}

export async function reject(req: Request, res: Response, next: NextFunction) {
  try {
    success(res, await transferService.reviewTransfer(Number(req.params.id), false, req.body, req.user!), '调岗申请已驳回');
  } catch (error) {
    next(error);
  }
}

export async function withdraw(req: Request, res: Response, next: NextFunction) {
  try {
    success(res, await transferService.withdrawTransfer(Number(req.params.id), req.user!), '调岗申请已撤回');
  } catch (error) {
    next(error);
  }
}
