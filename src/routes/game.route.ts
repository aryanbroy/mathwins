import { Router } from 'express';
import { demoQuestion, createGameConfigFromFile } from '../controller/game.controller';

const router = Router();

router.post('/addquestion', demoQuestion);
router.get('/createGameConfig', createGameConfigFromFile);

export default router;
