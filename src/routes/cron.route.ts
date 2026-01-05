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
router.post('/dailyUserLeaderboard', getDailyUserLeaderboard);

export default router;
