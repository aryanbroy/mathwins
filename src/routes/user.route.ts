import { Router } from 'express';
import {
  createUser,
  getAllUsers,
  getCoinsSummary,
  getTransactionHistory,
} from '../controller/user.controller';
import { verifyUser } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', getAllUsers);
// router.post('/create', createUser);

// router.get('/coins/summary', verifyUser, getCoinsSummary);
// router.get('/coins', verifyUser, getTransactionHistory);

export default router;
