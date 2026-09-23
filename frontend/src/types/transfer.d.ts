import type { TransferStatus } from '@/constants/enums';

export interface TransferRequest {
  id: number;
  employeeId: number;
  targetDepartment: string;
  targetPosition: string;
  targetStoreId: number;
  effectiveDate: string;
  status: keyof typeof TransferStatus;
  applicantId: number;
  approverId: number | null;
  approvedAt: string | null;
  rejectReason: string | null;
  processedAt: string | null;
  remark: string | null;
  createdAt: string;
  employee?: { id: number; name: string; employeeNo: string; department: string; position: string; storeId: number | null };
  targetStore?: { id: number; name: string };
  applicant?: { id: number; username: string };
  approver?: { id: number; username: string } | null;
}
