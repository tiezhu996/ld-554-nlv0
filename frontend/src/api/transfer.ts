import { request } from '@/utils/request';

export function fetchTransfers(params = {}) {
  return request.get('/transfers', { params });
}

export function fetchTransfer(id: number) {
  return request.get(`/transfers/${id}`);
}

export function createTransfer(data: {
  employeeId: number;
  targetDepartment: string;
  targetPosition: string;
  targetStoreId: number;
  effectiveDate: string;
}) {
  return request.post('/transfers', data);
}

export function approveTransfer(id: number, comment?: string) {
  return request.post(`/transfers/${id}/approve`, { comment });
}

export function rejectTransfer(id: number, comment?: string) {
  return request.post(`/transfers/${id}/reject`, { comment });
}

export function withdrawTransfer(id: number) {
  return request.post(`/transfers/${id}/withdraw`);
}
