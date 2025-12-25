import { Router } from 'express';
import { verifyUser } from '../middlewares/auth.middleware';
import { postClaimRequest } from '../controller/rewards.controller';
import { listRewardClaimsHandler } from '../helpers/reward.helper';

const router = Router();

router.post('/claim_request', verifyUser, postClaimRequest);
router.get('/claims', verifyUser, listRewardClaimsHandler);
export default router;
