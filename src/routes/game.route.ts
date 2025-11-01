import { Router } from 'express';
import { addQuestion, Leaderboard, getGameConfig, createSet } from '../controller/game.controller';

const router = Router();

router.post('/addQuestion', addQuestion);
router.post('/Leaderboard', Leaderboard);
router.get('/getGameConfig', getGameConfig);
router.get('/checkSet', createSet);

export default router;
