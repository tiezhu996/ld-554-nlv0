import type { NextFunction, Request, Response } from 'express';
import * as transferService from '../services/transfer.service.js';
import { created, success } from '../utils/response.js';

export async function index(req: Request, res: Response, next: NextFunction) {
  try {
    success(res, await transferService.listTransferRequests(req.query, req.user));
  } catch (error) {
    next(error);
  }
}

export async function show(req: Request, res: Response, next: NextFunction) {
  try {
    success(res, await transferService.getTransferRequest(Number(req.params.id)));
  } catch (error) {
    next(error);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    created(res, await transferService.createTransferRequest(req.body, req.user!));
  } catch (error) {
    next(error);
  }
}

export async function review(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await transferService.reviewTransferRequest(
      Number(req.params.id),
      { approved: Boolean(req.body.approved), rejectReason: req.body.rejectReason },
      req.user!
    );
    success(res, result);
  } catch (error) {
    next(error);
  }
}

export async function withdraw(req: Request, res: Response, next: NextFunction) {
  try {
    success(res, await transferService.withdrawTransferRequest(Number(req.params.id), req.user!));
  } catch (error) {
    next(error);
  }
}
