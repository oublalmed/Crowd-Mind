import { Request, Response } from 'express';
import { PaymentController } from '../controllers/payment.controller';
import * as paymentService from '../services/payment.service';

jest.mock('../services/payment.service');

const mockResponse = (): Response => {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mockRequest = (
  body: Record<string, unknown> = {},
  params: Record<string, string> = {},
  query: Record<string, string> = {}
): Request =>
  ({ body, params, query } as unknown as Request);

describe('PaymentController', () => {
  let controller: PaymentController;
  let res: Response;

  beforeEach(() => {
    controller = new PaymentController();
    res = mockResponse();
    jest.clearAllMocks();
  });

  // =========================================================================
  // listProducts
  // =========================================================================
  describe('listProducts', () => {
    it('returns product list', async () => {
      const products = [
        { id: 'coins_500', name: '500 Coins', priceUsd: 4.99 },
      ];
      (paymentService.getProducts as jest.Mock).mockResolvedValue(products);

      await controller.listProducts(mockRequest(), res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: products,
      });
    });
  });

  // =========================================================================
  // getProduct
  // =========================================================================
  describe('getProduct', () => {
    it('returns product when found', async () => {
      const product = { id: 'coins_500', name: '500 Coins' };
      (paymentService.getProduct as jest.Mock).mockResolvedValue(product);

      await controller.getProduct(mockRequest({}, { productId: 'coins_500' }), res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: product,
      });
    });

    it('returns 404 when product not found', async () => {
      (paymentService.getProduct as jest.Mock).mockResolvedValue(undefined);

      await controller.getProduct(mockRequest({}, { productId: 'invalid' }), res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  // =========================================================================
  // getBalance
  // =========================================================================
  describe('getBalance', () => {
    it('returns wallet balance', async () => {
      const balance = { userId: 'user-1', coins: 500 };
      (paymentService.getWalletBalance as jest.Mock).mockResolvedValue(balance);

      await controller.getBalance(mockRequest({}, { userId: 'user-1' }), res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: balance,
      });
    });
  });

  // =========================================================================
  // purchase
  // =========================================================================
  describe('purchase', () => {
    it('returns 201 on successful purchase', async () => {
      const transaction = {
        id: 'tx-1',
        userId: 'user-1',
        type: 'purchase',
        status: 'completed',
        coins: 500,
      };
      (paymentService.purchaseProduct as jest.Mock).mockResolvedValue(transaction);

      await controller.purchase(
        mockRequest({ userId: 'user-1', productId: 'coins_500', amount: 4.99 }),
        res
      );

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: transaction,
      });
    });

    it('returns 400 when required fields are missing', async () => {
      await controller.purchase(mockRequest({ userId: 'user-1' }), res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('returns PaymentError status code', async () => {
      (paymentService.purchaseProduct as jest.Mock).mockRejectedValue(
        new paymentService.PaymentError('Product not found', 'PRODUCT_NOT_FOUND', 404)
      );

      await controller.purchase(
        mockRequest({ userId: 'user-1', productId: 'bad', amount: 1 }),
        res
      );

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  // =========================================================================
  // getTransactions
  // =========================================================================
  describe('getTransactions', () => {
    it('returns transaction history', async () => {
      const transactions = [
        { id: 'tx-1', type: 'purchase', coins: 500 },
      ];
      (paymentService.getTransactionHistory as jest.Mock).mockResolvedValue(transactions);

      await controller.getTransactions(
        mockRequest({}, { userId: 'user-1' }, { limit: '10', offset: '0' }),
        res
      );

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: transactions,
      });
    });
  });
});
