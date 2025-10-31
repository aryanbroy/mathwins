import { Router } from 'express';
import { addQuestion, createTournament, Leaderboard } from '../controller/game.controller';

const router = Router();

router.post('/addQuestion', addQuestion);
router.post('/createTournament', createTournament);
router.post('/Leaderboard', Leaderboard);

export default router;
