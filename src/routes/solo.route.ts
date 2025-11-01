import { Router } from 'express';
import { startSolo } from '../controller/solo.controller';

const router = Router();

router.post('/start', startSolo);

export default router;
