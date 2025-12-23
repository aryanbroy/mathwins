import { Router } from 'express';
import { continueSolo, nextQuestion, quitSolo, startSolo, finalSessionSubmission, leaderboard } from '../controller/solo.controller';
import { verifyUser } from '../middlewares/auth.middleware';

const router = Router();

router.post('/start', verifyUser, startSolo);
router.post('/continue', verifyUser, continueSolo);
router.post('/quit', verifyUser, quitSolo);
router.post('/nextquestion', verifyUser, nextQuestion);
router.post('/finalsubmission', verifyUser, finalSessionSubmission);
router.post('/leaderboard', verifyUser, leaderboard);


export default router;
