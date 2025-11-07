import { Router } from 'express';
import { continueSolo, nextQuestion, quitSolo, startSolo, finalSessionSubmission } from '../controller/solo.controller';

const router = Router();

router.post('/start', startSolo);
router.post('/continue', continueSolo);
router.post('/quit', quitSolo);
router.post('/nextquestion', nextQuestion);
router.post('/finalsubmission', finalSessionSubmission);


export default router;
