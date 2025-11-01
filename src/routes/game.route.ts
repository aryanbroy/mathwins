import { Router } from 'express';
import { addQuestion, Leaderboard, getGameConfig } from '../controller/game.controller';

const router = Router();

router.post('/addQuestion', addQuestion);
router.post('/Leaderboard', Leaderboard);
router.get('/getGameConfig', getGameConfig);

export default router;
