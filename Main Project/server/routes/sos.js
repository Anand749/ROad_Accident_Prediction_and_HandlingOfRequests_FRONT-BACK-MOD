import express from 'express';
import {
  triggerSOS,
  getAllSOS,
  getMyAlerts,
  assignWorker,
  resolveSOS,
  workerResolveSOS,
  userConfirmResolve,
  userDisputeResolve,
  getNearbyWorkersForSOS,
  getNearbySOSHistory,
} from '../controllers/sosController.js';
import { authMiddleware, adminOnly } from '../middleware/auth.js';

const router = express.Router();

router.post('/trigger', authMiddleware, triggerSOS);
router.get('/my-alerts', authMiddleware, getMyAlerts);
router.get('/nearby-history', authMiddleware, getNearbySOSHistory);
router.get('/', authMiddleware, adminOnly, getAllSOS);
router.get('/:id/workers', authMiddleware, adminOnly, getNearbyWorkersForSOS);
router.patch('/:id/assign', authMiddleware, adminOnly, assignWorker);
router.patch('/:id/resolve', authMiddleware, adminOnly, resolveSOS);
router.patch('/:id/worker-resolve', authMiddleware, workerResolveSOS);
router.patch('/:id/confirm', authMiddleware, userConfirmResolve);
router.patch('/:id/dispute', authMiddleware, userDisputeResolve);

export default router;
