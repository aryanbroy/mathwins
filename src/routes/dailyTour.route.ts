import { Router } from 'express';
import {
  createDailyTournament,
  createDailyTournamentSession,
  fetchDailyTournament,
  finalSessionSubmission,
  minuteScoreUpdate,
  updateSessionScore,
} from '../controller/dailyTour.controller';
import { verifyUser } from '../middlewares/auth.middleware';

const router = Router();

router.post('/start', fetchDailyTournament);
router.post('/create', verifyUser, createDailyTournament);

router.post('/session/create', verifyUser, createDailyTournamentSession);
router.patch('/session/update_score', verifyUser, updateSessionScore);
router.post('/session/submit_final', verifyUser, finalSessionSubmission);

router.post('/update/score/:minute', minuteScoreUpdate);

export default router;
