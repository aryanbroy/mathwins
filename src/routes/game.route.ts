import { Router } from 'express';
import { demoQuestion } from '../controller/game.controller';

const router = Router();

router.post('/addquestion', demoQuestion);

export default router;
