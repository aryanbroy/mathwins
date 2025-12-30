import { Router } from 'express';
import { verifyUser } from '../middlewares/auth.middleware';
import { FiftyFifty, LevelDown } from '../controller/lifeline.controller';

const router = Router();

router.post('/LevelDown', verifyUser, LevelDown);
router.post('/fiftyfifty', verifyUser, FiftyFifty);

export default router;