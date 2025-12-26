import { Router } from 'express';
import {
  createUser,
  getAllUsers,
  getUser
  // getCoinsSummary,
  // getTransactionHistory,
} from '../controller/user.controller';
import { verifyUser } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', verifyUser, getAllUsers);
router.post('/create', createUser);
router.post('/getuserdata', getUser);

// router.get('/coins/summary', verifyUser, getCoinsSummary);
// router.get('/coins', verifyUser, getTransactionHistory);

export default router;
