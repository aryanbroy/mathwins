import { Router } from 'express';
import {
  createDailyTournament,
  createDailyTournamentSession,
  fetchDailyAttempts,
  fetchDailyTournament,
  finalSessionSubmission,
  getDailyLeaderboard,
  minuteScoreUpdate,
  submitQuestion,
} from '../controller/dailyTour.controller';
import { verifyUser } from '../middlewares/auth.middleware';
import { isAdmin } from '../middlewares/adminAuth.middleware';

const router = Router();

router.get('/attempts', verifyUser, fetchDailyAttempts);
router.post('/create', isAdmin, createDailyTournament);
router.get('/start', verifyUser, fetchDailyTournament);

router.post('/session/create', verifyUser, createDailyTournamentSession);
router.patch('/session/submit_question', verifyUser, submitQuestion);
router.post('/session/submit_final', verifyUser, finalSessionSubmission);

router.post('/update/score/:minute', minuteScoreUpdate);
router.get('/leaderboard', verifyUser, getDailyLeaderboard);

export default router;
