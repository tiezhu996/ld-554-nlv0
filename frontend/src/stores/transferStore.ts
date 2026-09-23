import { defineStore } from 'pinia';
import { fetchTransferRequests } from '@/api/transfer';
import type { TransferRequest } from '@/types/transfer';

export const useTransferStore = defineStore('transfers', {
  state: () => ({ list: [] as TransferRequest[], total: 0 }),
  actions: {
    async load(params: Record<string, unknown> = {}) {
      const response = (await fetchTransferRequests(params)) as {
        data: { list: TransferRequest[]; total: number };
      };
      this.list = response.data.list;
      this.total = response.data.total;
    }
  }
});
