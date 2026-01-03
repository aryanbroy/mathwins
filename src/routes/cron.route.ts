import { Router } from 'express';
import {
  assignCoinPoints,
  assignInstantCoinPoints,
  assignTotalPoints,
} from '../controller/cron.controller';

const router = Router();

router.post('/daily', assignCoinPoints);
router.post('/instant', assignInstantCoinPoints);
router.post('/total', assignTotalPoints);

export default router;
