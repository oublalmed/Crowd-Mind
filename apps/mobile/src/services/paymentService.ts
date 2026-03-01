import api from './api';

export interface Product {
  id: string;
  name: string;
  description: string;
  priceUsd: number;
  coins: number;
  category: string;
}

export interface WalletBalance {
  userId: string;
  coins: number;
}

export interface Transaction {
  id: string;
  type: string;
  status: string;
  amount: number;
  currency: string;
  coins: number;
  productId: string | null;
  description: string;
  createdAt: string;
}

const paymentService = {
  getProducts: async (): Promise<Product[]> => {
    const response = await api.get<Product[]>('/v1/payments/products');
    return response.data;
  },

  getBalance: async (): Promise<WalletBalance> => {
    const response = await api.get<WalletBalance>('/v1/payments/wallet');
    return response.data;
  },

  purchase: async (productId: string, amount: number): Promise<Transaction> => {
    const response = await api.post<Transaction>('/v1/payments/purchase', {
      productId,
      amount,
    });
    return response.data;
  },

  getTransactions: async (limit = 20, offset = 0): Promise<Transaction[]> => {
    const response = await api.get<Transaction[]>('/v1/payments/transactions', {
      params: { limit, offset },
    });
    return response.data;
  },
};

export default paymentService;
