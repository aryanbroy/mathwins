import { Router } from 'express';
import {
  joinOrCreateTournament,
  testInstant,
} from '../controller/instant.controller';
import { verifyUser } from '../middlewares/auth.middleware';

const router = Router();

router.get('/test', testInstant);
router.post('/join_or_create', verifyUser, joinOrCreateTournament);

export default router;
