import { Router } from 'express';
import { addQuestion, Leaderboard } from '../controller/game.controller';

const router = Router();

router.post('/addQuestion', addQuestion);
router.post('/Leaderboard', Leaderboard);

export default router;
