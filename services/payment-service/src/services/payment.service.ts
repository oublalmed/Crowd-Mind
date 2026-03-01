import { v4 as uuidv4 } from 'uuid';
import pool from '../db';
import { config } from '../config';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'refunded';
export type TransactionType = 'purchase' | 'reward' | 'refund' | 'gift';

export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  status: TransactionStatus;
  amount: number;
  currency: string;
  coins: number;
  productId: string | null;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WalletBalance {
  userId: string;
  coins: number;
}

export interface PurchaseInput {
  userId: string;
  productId: string;
  amount: number;
  currency?: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  priceUsd: number;
  coins: number;
  category: string;
  isActive: boolean;
}

// ---------------------------------------------------------------------------
// Mock product catalog (would come from DB in production)
// ---------------------------------------------------------------------------

const PRODUCTS: Product[] = [
  { id: 'coins_500', name: '500 Coins', description: 'Starter pack', priceUsd: 4.99, coins: 500, category: 'currency', isActive: true },
  { id: 'coins_1200', name: '1,200 Coins', description: 'Popular choice', priceUsd: 9.99, coins: 1200, category: 'currency', isActive: true },
  { id: 'coins_3500', name: '3,500 Coins', description: 'Best value', priceUsd: 24.99, coins: 3500, category: 'currency', isActive: true },
  { id: 'season_pass', name: 'Season Pass', description: 'Unlock exclusive rewards', priceUsd: 9.99, coins: 0, category: 'pass', isActive: true },
];

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export async function getProducts(): Promise<Product[]> {
  return PRODUCTS.filter((p) => p.isActive);
}

export async function getProduct(productId: string): Promise<Product | undefined> {
  return PRODUCTS.find((p) => p.id === productId && p.isActive);
}

export async function getWalletBalance(userId: string): Promise<WalletBalance> {
  try {
    const result = await pool.query(
      'SELECT coins FROM wallets WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      // Auto-create wallet with starter coins
      await pool.query(
        'INSERT INTO wallets (user_id, coins) VALUES ($1, $2) ON CONFLICT (user_id) DO NOTHING',
        [userId, 100]
      );
      return { userId, coins: 100 };
    }

    return { userId, coins: parseInt(result.rows[0].coins, 10) };
  } catch {
    return { userId, coins: 0 };
  }
}

export async function purchaseProduct(input: PurchaseInput): Promise<Transaction> {
  const { userId, productId, amount, currency = 'USD' } = input;

  const product = await getProduct(productId);
  if (!product) {
    throw new PaymentError('Product not found', 'PRODUCT_NOT_FOUND', 404);
  }

  const transactionId = uuidv4();

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Record transaction
    await client.query(
      `INSERT INTO transactions (id, user_id, type, status, amount, currency, coins, product_id, description)
       VALUES ($1, $2, 'purchase', 'completed', $3, $4, $5, $6, $7)`,
      [transactionId, userId, amount, currency, product.coins, productId, `Purchased ${product.name}`]
    );

    // Credit coins to wallet
    if (product.coins > 0) {
      await client.query(
        `INSERT INTO wallets (user_id, coins) VALUES ($1, $2)
         ON CONFLICT (user_id) DO UPDATE SET coins = wallets.coins + $2`,
        [userId, product.coins]
      );
    }

    await client.query('COMMIT');

    return {
      id: transactionId,
      userId,
      type: 'purchase',
      status: 'completed',
      amount,
      currency,
      coins: product.coins,
      productId,
      description: `Purchased ${product.name}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function getTransactionHistory(
  userId: string,
  limit = 20,
  offset = 0
): Promise<Transaction[]> {
  try {
    const result = await pool.query(
      `SELECT id, user_id, type, status, amount, currency, coins, product_id, description, created_at, updated_at
       FROM transactions
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    return result.rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      type: row.type,
      status: row.status,
      amount: parseFloat(row.amount),
      currency: row.currency,
      coins: parseInt(row.coins, 10),
      productId: row.product_id,
      description: row.description,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  } catch {
    return [];
  }
}

export async function rewardCoins(
  userId: string,
  coins: number,
  description: string
): Promise<Transaction> {
  const transactionId = uuidv4();

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      `INSERT INTO transactions (id, user_id, type, status, amount, currency, coins, description)
       VALUES ($1, $2, 'reward', 'completed', 0, 'USD', $3, $4)`,
      [transactionId, userId, coins, description]
    );

    await client.query(
      `INSERT INTO wallets (user_id, coins) VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE SET coins = wallets.coins + $2`,
      [userId, coins]
    );

    await client.query('COMMIT');

    return {
      id: transactionId,
      userId,
      type: 'reward',
      status: 'completed',
      amount: 0,
      currency: 'USD',
      coins,
      productId: null,
      description,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ---------------------------------------------------------------------------
// Error class
// ---------------------------------------------------------------------------

export class PaymentError extends Error {
  public readonly code: string;
  public readonly statusCode: number;

  constructor(message: string, code: string, statusCode: number) {
    super(message);
    this.name = 'PaymentError';
    this.code = code;
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, PaymentError.prototype);
  }
}
