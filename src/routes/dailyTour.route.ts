import { Router } from 'express';
import {
  createDailyTournament,
  fetchDailyTournament,
} from '../controller/dailyTour.controller';
import { verifyUser } from '../middlewares/auth.middleware';

const router = Router();

router.post('/start', fetchDailyTournament);
router.post('/create', verifyUser, createDailyTournament);
// router.post('/submit_final', timeCheck.middleware, submitDailyTournament)

export default router;
