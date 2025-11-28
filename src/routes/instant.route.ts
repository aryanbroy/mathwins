import { Router } from 'express';
import {
  joinOrCreateTournament,
  listRooms,
  startSession,
  submitFinal,
  submitQuestion,
  testInstant,
} from '../controller/instant.controller';
import { verifyUser } from '../middlewares/auth.middleware';

const router = Router();

router.get('/test', testInstant);
router.post('/join_or_create', verifyUser, joinOrCreateTournament);
router.post('/start_session', verifyUser, startSession);
router.get('/rooms/available', verifyUser, listRooms);
router.post('/submit_question', verifyUser, submitQuestion);
router.post('/submit_final', verifyUser, submitFinal);

export default router;
