import { request } from '@/utils/request';

export function fetchTransferRequests(params: Record<string, unknown> = {}) {
  return request.get('/transfers', { params });
}

export function fetchTransferRequest(id: number) {
  return request.get(`/transfers/${id}`);
}

export function createTransferRequest(data: Record<string, unknown>) {
  return request.post('/transfers', data);
}

export function reviewTransferRequest(id: number, data: { approved: boolean; rejectReason?: string }) {
  return request.post(`/transfers/${id}/review`, data);
}

export function withdrawTransferRequest(id: number) {
  return request.post(`/transfers/${id}/withdraw`);
}
