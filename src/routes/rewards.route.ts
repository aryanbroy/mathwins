import { Router } from 'express';
import { verifyUser } from '../middlewares/auth.middleware';
import { postClaimRequest } from '../controller/rewards.controller';

const router = Router();

router.post('/claim_request', verifyUser, postClaimRequest);
export default router;
