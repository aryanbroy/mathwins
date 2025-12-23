import { Router } from 'express';
import { isAdmin } from '../../middlewares/adminAuth.middleware';
import {
  getActiveGameConfig,
  createConfig,
  changeConfig,
} from '../../controller/admin/editconfig.controller';
import { verifyUser } from '../../middlewares/auth.middleware';
import { listAllClaims } from '../../controller/admin/admin.controller';

const router = Router();

router.post('/create', isAdmin, createConfig);

router.post('/gameConfig', isAdmin, getActiveGameConfig);

router.patch(
  '/config',
  isAdmin, // must verify admin email
  changeConfig
);

router.post('/rewards/claims', isAdmin, listAllClaims);

export default router;
