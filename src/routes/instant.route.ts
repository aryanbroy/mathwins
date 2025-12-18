import { Router } from 'express';
import {
  allTournaments,
  getPlayersInTournament,
  joinOrCreateTournament,
  listRooms,
  startSession,
  submitFinal,
  submitQuestion,
  testInstant,
  tournamentLeaderboard,
} from '../controller/instant.controller';
import { verifyUser } from '../middlewares/auth.middleware';

const router = Router();

router.get('/test', testInstant);
router.post('/players', verifyUser, getPlayersInTournament);
router.post('/join_or_create', verifyUser, joinOrCreateTournament);
router.post('/start_session', verifyUser, startSession);
router.get('/rooms/available', verifyUser, listRooms);
router.post('/submit_question', verifyUser, submitQuestion);
router.post('/submit_final', verifyUser, submitFinal);
router.get('/participated_tournaments', verifyUser, allTournaments);
router.post('/session_leaderboard', verifyUser, tournamentLeaderboard);

export default router;
