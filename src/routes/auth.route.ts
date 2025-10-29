import { Router } from 'express';
import { googleAuth } from '../controller/auth.controller';

const router = Router();

router.get('/auth/google', googleAuth);

export default router;
