import { Router, Request, Response } from 'express';
import { getAllUsers } from '../controller/user.controller';

const router = Router();

router.get('/users', getAllUsers);

export default router;
