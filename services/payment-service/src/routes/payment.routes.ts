import { Router } from 'express';
import { PaymentController } from '../controllers/payment.controller';

const router = Router();
const controller = new PaymentController();

// Products
router.get('/products', (req, res) => controller.listProducts(req, res));
router.get('/products/:productId', (req, res) => controller.getProduct(req, res));

// Wallet
router.get('/wallet/:userId', (req, res) => controller.getBalance(req, res));

// Purchases
router.post('/purchase', (req, res) => controller.purchase(req, res));

// Transaction history
router.get('/transactions/:userId', (req, res) => controller.getTransactions(req, res));

export default router;
