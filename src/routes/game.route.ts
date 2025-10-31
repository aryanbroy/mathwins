import { Router } from 'express';
import { addQuestion } from '../controller/game.controller';

const router = Router();

router.post('/add', addQuestion);

export default router;
