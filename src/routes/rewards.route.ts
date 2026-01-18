import { Router } from 'express';
import { verifyUser } from '../middlewares/auth.middleware';
import {
  claimDailyReward,
  fetchStreak,
  fetchUserCoinPoints,
  postClaimRequest,
} from '../controller/rewards.controller';
import { listRewardClaimsHandler } from '../helpers/reward.helper';

const router = Router();

router.post('/claim_request', verifyUser, postClaimRequest);
router.get('/claims', verifyUser, listRewardClaimsHandler);
router.post('/daily_claim', verifyUser, claimDailyReward);
router.get('/coinPoints', verifyUser, fetchUserCoinPoints);
router.get('/streak', verifyUser, fetchStreak);
export default router;
