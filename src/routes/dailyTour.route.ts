import { Router } from 'express';
import {
  createDailyTournament,
  createDailyTournamentSession,
  fetchDailyTournament,
} from '../controller/dailyTour.controller';
import { verifyUser } from '../middlewares/auth.middleware';

const router = Router();

router.post('/start', fetchDailyTournament);
router.post('/create', verifyUser, createDailyTournament);

router.post('/session/create', verifyUser, createDailyTournamentSession);

export default router;
