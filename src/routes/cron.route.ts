import { Router } from 'express';
import { assignCoinPoints } from '../controller/cron.controller';

const router = Router();

router.post('/daily', assignCoinPoints);

export default router;
