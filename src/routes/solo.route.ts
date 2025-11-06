import { Router } from 'express';
import { continueSolo, nextQuestion, quitSolo, startSolo } from '../controller/solo.controller';

const router = Router();

router.post('/start', startSolo);
router.post('/continue', continueSolo);
router.post('/quit', quitSolo);
router.post('/nextquestion', nextQuestion);


export default router;
