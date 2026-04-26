import express from 'express';
import {
  getAllWorkers,
  getNearbyWorkers,
  createWorker,
  updateWorker,
  getMyWorkerProfile,
  getMyAssignedAlerts,
} from '../controllers/workerController.js';
import { authMiddleware, adminOnly } from '../middleware/auth.js';

const router = express.Router();

// Worker's own endpoints (must come before /:id)
router.get('/me', authMiddleware, getMyWorkerProfile);
router.get('/me/alerts', authMiddleware, getMyAssignedAlerts);

router.get('/', authMiddleware, adminOnly, getAllWorkers);
router.get('/nearby', getNearbyWorkers);
router.post('/', authMiddleware, adminOnly, createWorker);
router.patch('/:id', authMiddleware, adminOnly, updateWorker);

export default router;
