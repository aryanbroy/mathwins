import { Router } from 'express';
import { createUser, getAllUsers } from '../controller/user.controller';

const router = Router();

router.get('/', getAllUsers);
router.post('/create', createUser);

export default router;
