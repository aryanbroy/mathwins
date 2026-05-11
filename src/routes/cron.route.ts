import { Router } from 'express';
import {
  assignCoinPoints,
  assignInstantCoinPoints,
  assignTotalPoints,
  getDailyUserLeaderboard,
} from '../controller/cron.controller';

const router = Router();

router.post('/daily', assignCoinPoints);
router.post('/instant', assignInstantCoinPoints);
router.post('/total', assignTotalPoints);
router.get('/dailyUserLeaderboard', getDailyUserLeaderboard);

export default router;
