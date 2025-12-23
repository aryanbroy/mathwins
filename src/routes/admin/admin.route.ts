import { Router } from 'express';
import { isAdmin } from "../../middlewares/adminAuth.middleware";
import { getActiveGameConfig, createConfig, changeConfig } from '../../controller/admin/editconfig.controller';

const router = Router();

router.post(
  "/create",
  isAdmin,
  createConfig
);

router.post(
  "/gameConfig",
  isAdmin,
  getActiveGameConfig
);

router.patch(
  "/config",
  isAdmin,        // must verify admin email
  changeConfig
);

export default router;
