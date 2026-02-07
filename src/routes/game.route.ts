import { Router } from 'express';
import { demoQuestion, createGameConfigFromFile } from '../controller/game.controller';
import { getActiveGameConfig } from '../controller/admin/editconfig.controller';

const router = Router();

router.post('/addquestion', demoQuestion);
router.get('/createGameConfig', createGameConfigFromFile);
router.post('/gameConfig', getActiveGameConfig);

export default router;
