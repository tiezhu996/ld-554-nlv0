import { defineStore } from 'pinia';
import { fetchTransfers } from '@/api/transfer';
import type { TransferRequest } from '@/types/transfer';

export const useTransferStore = defineStore('transfers', {
  state: () => ({ list: [] as TransferRequest[], total: 0 }),
  actions: {
    async load(params = {}) {
      const response = (await fetchTransfers(params)) as { data: { list: TransferRequest[]; total: number } };
      this.list = response.data.list;
      this.total = response.data.total;
    }
  }
});
