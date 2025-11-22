import { Router } from 'express';
import {
  joinOrCreateTournament,
  testInstant,
} from '../controller/instant.controller';

const router = Router();

router.get('/test', testInstant);
router.post('/join_or_create', joinOrCreateTournament);

export default router;
