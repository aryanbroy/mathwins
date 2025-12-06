import { Router } from 'express';
import {
  createDailyTournament,
  createDailyTournamentSession,
  fetchDailyAttempts,
  fetchDailyTournament,
  finalSessionSubmission,
  minuteScoreUpdate,
  submitQuestion,
} from '../controller/dailyTour.controller';
import { verifyUser } from '../middlewares/auth.middleware';

const router = Router();

router.get('/attempts', verifyUser, fetchDailyAttempts);
router.post('/create', verifyUser, createDailyTournament);
router.get('/start', verifyUser, fetchDailyTournament);

router.post('/session/create', verifyUser, createDailyTournamentSession);
router.patch('/session/submit_question', verifyUser, submitQuestion);
router.post('/session/submit_final', verifyUser, finalSessionSubmission);

router.post('/update/score/:minute', minuteScoreUpdate);

export default router;
