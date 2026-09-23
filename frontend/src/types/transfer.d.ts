import type { TransferStatusValue } from '@/constants/enums';
import type { Employee } from './employee';
import type { Store } from './store';

export interface TransferRequest {
  id: number;
  employeeId: number;
  applicantId: number;
  targetDepartment: string;
  targetPosition: string;
  targetStoreId: number;
  effectiveDate: string;
  status: TransferStatusValue;
  reviewerId: number | null;
  reviewComment: string | null;
  reviewedAt: string | null;
  transferredShiftCount: number;
  createdAt: string;
  updatedAt: string;
  employee?: Employee;
  targetStore?: Store;
  applicant?: {
    id: number;
    username: string;
    profile?: Employee;
  };
  reviewer?: {
    id: number;
    username: string;
    profile?: Employee;
  };
}
