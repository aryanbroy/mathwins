import { Router } from 'express';
import { updateSolo } from '../../controller/admin/editconfig.controller';

const router = Router();

router.post('/updatesolo', updateSolo);

export default router;
