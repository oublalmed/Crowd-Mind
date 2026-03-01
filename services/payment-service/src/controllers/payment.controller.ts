import { Request, Response } from 'express';
import {
  getProducts,
  getProduct,
  getWalletBalance,
  purchaseProduct,
  getTransactionHistory,
  PaymentError,
} from '../services/payment.service';

export class PaymentController {
  /**
   * GET /products
   * List available products.
   */
  async listProducts(_req: Request, res: Response): Promise<void> {
    try {
      const products = await getProducts();
      res.json({ success: true, data: products });
    } catch (err) {
      console.error('[PaymentController] listProducts error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * GET /products/:productId
   * Get a single product.
   */
  async getProduct(req: Request, res: Response): Promise<void> {
    try {
      const product = await getProduct(req.params.productId);
      if (!product) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Product not found' },
        });
        return;
      }
      res.json({ success: true, data: product });
    } catch (err) {
      console.error('[PaymentController] getProduct error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * GET /wallet/:userId
   * Get a user's coin balance.
   */
  async getBalance(req: Request, res: Response): Promise<void> {
    try {
      const balance = await getWalletBalance(req.params.userId);
      res.json({ success: true, data: balance });
    } catch (err) {
      console.error('[PaymentController] getBalance error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * POST /purchase
   * Purchase a product.
   */
  async purchase(req: Request, res: Response): Promise<void> {
    try {
      const { userId, productId, amount, currency } = req.body;

      if (!userId || !productId || amount == null) {
        res.status(400).json({
          success: false,
          error: { code: 'MISSING_FIELDS', message: 'userId, productId, and amount are required' },
        });
        return;
      }

      const transaction = await purchaseProduct({ userId, productId, amount, currency });
      res.status(201).json({ success: true, data: transaction });
    } catch (err) {
      if (err instanceof PaymentError) {
        res.status(err.statusCode).json({
          success: false,
          error: { code: err.code, message: err.message },
        });
        return;
      }
      console.error('[PaymentController] purchase error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * GET /transactions/:userId
   * Get transaction history for a user.
   */
  async getTransactions(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const limit = parseInt(req.query.limit as string, 10) || 20;
      const offset = parseInt(req.query.offset as string, 10) || 0;

      const transactions = await getTransactionHistory(userId, limit, offset);
      res.json({ success: true, data: transactions });
    } catch (err) {
      console.error('[PaymentController] getTransactions error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
