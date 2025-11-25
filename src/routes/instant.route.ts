import { Router } from 'express';
import {
  joinOrCreateTournament,
  startSession,
  testInstant,
} from '../controller/instant.controller';
import { verifyUser } from '../middlewares/auth.middleware';

const router = Router();

router.get('/test', testInstant);
router.post('/join_or_create', verifyUser, joinOrCreateTournament);
router.post('/start_session', verifyUser, startSession);

export default router;
