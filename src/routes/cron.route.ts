import { Router } from 'express';
import {
  assignCoinPoints,
  assignInstantCoinPoints,
} from '../controller/cron.controller';

const router = Router();

router.post('/daily', assignCoinPoints);
router.post('/instant', assignInstantCoinPoints);

export default router;
